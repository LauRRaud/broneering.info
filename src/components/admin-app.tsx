"use client";
import {localeTags} from '@/lib/locales';
import LanguageSettings from './language-settings';
import ServiceTranslations from './service-translations';
import NotificationSettings from './notification-settings';
import CompanyProvisioning from './company-provisioning';
import Onboarding from './onboarding';
import ExportManagement from './export-management';
import ImportManagement from './import-management';
import CompanyExit from './company-exit';
import RetentionSettings from './retention-settings';
import OwnerInvitationRecovery from './owner-invitation-recovery';
import SubscriptionManagement from './subscription-management';
import BillingIssuer from './billing-issuer';
import {localizedFetch as fetch} from '@/lib/client-fetch';
import {useI18n} from '@/components/i18n-provider';


import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import ServiceManagement from '@/components/service-management';
import ScheduleManagement from '@/components/schedule-management';
import CustomerManagement from '@/components/customer-management';
import BookingManagement from '@/components/booking-management';
import type {ScheduleConflict} from '@/lib/schedule-contracts';
import EmbeddingSettingsForm from '@/components/embedding-settings';
import { delegationOptions, type AdminInvitation, type AdminMember, type AdminRole, type AdminState } from "@/lib/admin-contracts";

type AdminAppProps = {
  invitationToken?: string;
  resetToken?: string;
  authError?: string;
  initialLogin?: boolean;
};

type AdminResponse = { ok?: boolean; error?: string; code?: string; tenantId?: string; conflicts?:ScheduleConflict[];total?:number; grant?: { id: string; expiresAt: string } };

function errorMessage(value: { error?: { message?: string; code?: string } | null; message?: string } | undefined, fallback: string) {
  return value?.error?.message || value?.message || fallback;
}

function readError(body: AdminResponse, fallback: string) {
  return body.error || fallback;
}

function roleLabel(role: AdminRole) {
  return role === "owner" ? "Omanik" : role === "receptionist" ? "Vastuvõtt" : "Töötaja";
}

export default function AdminApp({ invitationToken = "", resetToken = "", authError = "", initialLogin = false }: AdminAppProps) {
  const {t,locale}=useI18n();

  const [state, setState] = useState<AdminState | null>(null);
  const [stateLoading, setStateLoading] = useState(true);
  const [stateError, setStateError] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [message, setMessage] = useState(authError);
  const [scheduleConflicts,setScheduleConflicts]=useState<{items:ScheduleConflict[];total:number}|null>(null);
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const [authView, setAuthView] = useState<"login" | "signup" | "forgot">(invitationToken && !initialLogin ? "signup" : "login");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [twoFactorView, setTwoFactorView] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [backupCode, setBackupCode] = useState("");
  const [enrollment, setEnrollment] = useState<{ uri: string; secret: string; backupCodes: string[] } | null>(null);
  const [enrollmentPassword, setEnrollmentPassword] = useState("");
  const [backupCodesSaved, setBackupCodesSaved] = useState(false);
  const [replacePassword, setReplacePassword] = useState("");
  const [changeCurrentPassword, setChangeCurrentPassword] = useState("");
  const [changeNewPassword, setChangeNewPassword] = useState("");
  const [changeNewPasswordConfirmation, setChangeNewPasswordConfirmation] = useState("");
  const [invitationHandled, setInvitationHandled] = useState(false);
  const [invitationActive, setInvitationActive] = useState(Boolean(invitationToken));
  const [resetHandled, setResetHandled] = useState(false);
  const [invitationError, setInvitationError] = useState("");
  const [supportGrant, setSupportGrant] = useState<{ id: string; expiresAt: string } | null>(null);
  const [inviteRole, setInviteRole] = useState<"receptionist" | "staff">("receptionist");
  const stateRequest = useRef(0);
  const stateAbort = useRef<AbortController | null>(null);

  const selected = state?.selected || state?.memberships.find((membership) => membership.tenantId === selectedTenantId) || state?.memberships[0];
  const requiresTwoFactor = !!state?.user && (state.user.isPlatformAdmin || selected?.role === "owner") && !state.user.twoFactorEnabled;
  const mailAvailable = state?.mailAvailable !== false;

  async function loadState(tenantId = selectedTenantId) {
    const currentRequest = ++stateRequest.current;
    stateAbort.current?.abort();
    const controller = new AbortController();
    stateAbort.current = controller;
    setStateLoading(true);
    setStateError("");
    const query = tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : "";
    try {
      const response = await fetch(`/api/admin/state${query}`, { credentials: "include", cache: "no-store", signal: controller.signal });
      const body = (await response.json()) as AdminState & AdminResponse;
      if (!response.ok) throw new Error(readError(body, t("Haldusandmete laadimine ebaõnnestus.")));
      if (currentRequest !== stateRequest.current) return;
      setState(body);
      if (!tenantId && !selectedTenantId) setSelectedTenantId(body.selected?.tenantId || body.memberships[0]?.tenantId || "");
    } catch (error: unknown) {
      if (controller.signal.aborted || currentRequest !== stateRequest.current) return;
      setStateError(error instanceof Error ? error.message : t("Haldusandmete laadimine ebaõnnestus."));
    } finally {
      if (currentRequest === stateRequest.current) setStateLoading(false);
    }
  }

  useEffect(() => { setScheduleConflicts(null); void loadState(); }, [selectedTenantId]);

  async function postAdmin(action: string, payload: Record<string, unknown>): Promise<AdminResponse> {
    const response = await fetch(`/api/admin/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    let body: AdminResponse = {};
    try { body = (await response.json()) as AdminResponse; } catch { body = {}; }
    if (!response.ok) {
      if(body.code==='SCHEDULE_CONFLICT'&&body.conflicts)setScheduleConflicts({items:body.conflicts,total:body.total??body.conflicts.length});
      throw new Error(readError(body, t("Toiming ebaõnnestus.")));
    }
    return body;
  }

  function startBusy(name: string) {
    if (busyRef.current || busy) return false;
    busyRef.current = true;
    setBusy(name);
    setMessage("");
    setScheduleConflicts(null);
    return true;
  }

  function finishBusy() { busyRef.current = false; setBusy(""); }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startBusy("login")) return;
    try {
      const response = await authClient.signIn.email({ email: loginEmail.trim(), password: loginPassword });
      if (response.error) {
        if (response.error.code === "EMAIL_NOT_VERIFIED") setVerificationEmail(loginEmail.trim());
        throw new Error(errorMessage(response, t("Sisselogimine ebaõnnestus.")));
      }
      if ((response.data as { twoFactorRedirect?: boolean } | null | undefined)?.twoFactorRedirect) {
        setTwoFactorView(true);
        setMessage(t("Sisesta autentimisrakenduse kood või varukood."));
      } else {
        setLoginPassword("");
        await loadState();
      }
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Sisselogimine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitationToken || !invitationActive) { setMessage(t("Uus konto on võimalik luua ainult kutsega.")); return; }
    if (signupPassword.length < 12) { setMessage(t("Parool peab olema vähemalt 12 märki.")); return; }
    if (!mailAvailable) { setMessage(t("E-kirjade saatmine ei ole seadistatud; registreerumist ei saa praegu lõpetada.")); return; }
    if (!startBusy("signup")) return;
    try {
      const callbackURL = `${window.location.origin}/?login=1&invitation=${encodeURIComponent(invitationToken)}`;
      const response = await authClient.signUp.email({ name: signupName.trim(), email: signupEmail.trim(), password: signupPassword, callbackURL, fetchOptions: { headers: { "x-invitation-token": invitationToken } } });
      if (response.error) throw new Error(errorMessage(response, t("Konto loomine ebaõnnestus.")));
      setMessage(t("Konto loodi. Kinnita oma e-posti aadress enne sisselogimist."));
      setVerificationEmail(signupEmail.trim());
      setAuthView("login");
      setLoginEmail(signupEmail);
      setSignupPassword("");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Konto loomine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function resendVerification(email = state?.user?.email) {
    if (!email || !mailAvailable || !startBusy("verification")) return;
    try {
      const callback = new URL(window.location.href);
      callback.searchParams.set("login", "1");
      const response = await authClient.sendVerificationEmail({ email, callbackURL: callback.toString() });
      if (response.error) throw new Error(errorMessage(response, t("Kinnituskirja saatmine ebaõnnestus.")));
      setMessage(t("Kinnituskiri saadeti uuesti."));
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Kinnituskirja saatmine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mailAvailable) { setMessage(t("E-kirjade saatmine ei ole seadistatud; parooli lähtestamist ei saa praegu taotleda.")); return; }
    if (!startBusy("forgot")) return;
    try {
      const response = await authClient.requestPasswordReset({ email: forgotEmail.trim(), redirectTo: `${window.location.origin}/?reset=1` });
      if (response.error) throw new Error(errorMessage(response, t("Lähtestuskirja taotlemine ebaõnnestus.")));
      setMessage(t("Kui aadress on süsteemis olemas, saadetakse sellele lähtestusjuhised."));
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Lähtestuskirja taotlemine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 12 || newPassword !== newPasswordConfirmation) { setMessage(t("Uus parool peab olema vähemalt 12 märki ja kinnitused peavad ühtima.")); return; }
    if (!startBusy("reset")) return;
    try {
      const response = await authClient.resetPassword({ newPassword, token: resetToken });
      if (response.error) throw new Error(errorMessage(response, t("Parooli lähtestamine ebaõnnestus.")));
      setMessage(t("Parool on muudetud. Logi uue parooliga sisse."));
      setResetHandled(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      setNewPassword("");
      setNewPasswordConfirmation("");
      setAuthView("login");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Parooli lähtestamine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function verifyTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startBusy("two-factor")) return;
    try {
      const response = await authClient.twoFactor.verifyTotp({ code: twoFactorCode.trim() });
      if (response.error) throw new Error(errorMessage(response, t("Autentimiskoodi kontroll ebaõnnestus.")));
      setTwoFactorView(false);
      setTwoFactorCode("");
      await loadState();
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Autentimiskoodi kontroll ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function verifyBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startBusy("backup-code")) return;
    try {
      const response = await authClient.twoFactor.verifyBackupCode({ code: backupCode.trim() });
      if (response.error) throw new Error(errorMessage(response, t("Varukoodi kontroll ebaõnnestus.")));
      setTwoFactorView(false);
      setBackupCode("");
      await loadState();
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Varukoodi kontroll ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function enableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startBusy("enroll")) return;
    try {
      const response = await authClient.twoFactor.enable({ password: enrollmentPassword, method: "totp" });
      const enrollmentData = response.data as { totpURI?: string; backupCodes?: string[] } | null | undefined;
      if (response.error || !enrollmentData?.totpURI) throw new Error(errorMessage(response, t("Kaheastmelise autentimise alustamine ebaõnnestus.")));
      let secret = enrollmentData.totpURI;
      try { secret = new URL(enrollmentData.totpURI).searchParams.get("secret") || enrollmentData.totpURI; } catch { /* Keep the URI as the manual setup value. */ }
      setEnrollment({ uri: enrollmentData.totpURI, secret, backupCodes: enrollmentData.backupCodes || [] });
      setEnrollmentPassword("");
      setMessage(t("Lisa autentimisrakendus käsitsi antud võtme abil ja salvesta varukoodid."));
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Kaheastmelise autentimise alustamine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!backupCodesSaved) { setMessage(t("Kinnita, et varukoodid on turvaliselt salvestatud.")); return; }
    if (!startBusy("enroll-verify")) return;
    try {
      const response = await authClient.twoFactor.verifyTotp({ code: twoFactorCode.trim() });
      if (response.error) throw new Error(errorMessage(response, t("Autentimisrakenduse koodi kontroll ebaõnnestus.")));
      setEnrollment(null);
      setBackupCodesSaved(false);
      setTwoFactorCode("");
      setMessage(t("Kaheastmeline autentimine on aktiveeritud."));
      await loadState();
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Autentimisrakenduse koodi kontroll ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function disableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startBusy("disable-2fa")) return;
    try {
      const response = await authClient.twoFactor.disable({ password: replacePassword });
      if (response.error) throw new Error(errorMessage(response, t("Autentimise keelamine ebaõnnestus.")));
      setReplacePassword("");
      setMessage(t("Autentimine on keelatud. Võid kohe uue autentimisrakenduse registreerida."));
      await loadState();
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Autentimise keelamine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changeNewPassword.length < 12 || changeNewPassword !== changeNewPasswordConfirmation) { setMessage(t("Uus parool peab olema vähemalt 12 märki ja kinnitused peavad ühtima.")); return; }
    if (!startBusy("change-password")) return;
    try {
      const response = await authClient.changePassword({ currentPassword: changeCurrentPassword, newPassword: changeNewPassword, revokeOtherSessions: true });
      if (response.error) throw new Error(errorMessage(response, t("Parooli muutmine ebaõnnestus.")));
      setChangeCurrentPassword("");
      setChangeNewPassword("");
      setChangeNewPasswordConfirmation("");
      setMessage(t("Parool on muudetud ja teised seansid lõpetatud."));
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Parooli muutmine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function signOut() {
    if (!startBusy("signout")) return;
    try {
      const response = await authClient.signOut();
      if (response.error) throw new Error(errorMessage(response, t("Väljalogimine ebaõnnestus.")));
      setState(null);
      setSelectedTenantId("");
      stateAbort.current?.abort();
      stateRequest.current += 1;
      setStateLoading(false);
      setEnrollment(null);
      setSupportGrant(null);
      setTwoFactorView(false);
      setTwoFactorCode("");
      setBackupCode("");
      setEnrollmentPassword("");
      setBackupCodesSaved(false);
      setReplacePassword("");
      setChangeCurrentPassword("");
      setChangeNewPassword("");
      setChangeNewPasswordConfirmation("");
      setVerificationEmail("");
      setMessage(t("Oled välja logitud."));
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Väljalogimine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function acceptInvitation() {
    if (!invitationToken || !invitationActive || invitationHandled || !state?.user?.emailVerified || !startBusy("accept-invitation")) return;
    try {
      const response = await postAdmin("accept-invitation", { token: invitationToken });
      if (response.error) throw new Error(readError(response, t("Kutse vastuvõtmine ebaõnnestus.")));
      setInvitationHandled(true);
      setInvitationError("");
      setMessage(t("Kutse võeti vastu."));
      const url = new URL(window.location.href);
      url.searchParams.delete("invitation");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      setInvitationActive(false);
      if (response.tenantId && response.tenantId !== selectedTenantId) setSelectedTenantId(response.tenantId);
      else await loadState(response.tenantId || selectedTenantId);
    } catch (error: unknown) { setInvitationError(error instanceof Error ? error.message : t("Kutse vastuvõtmine ebaõnnestus.")); }
    finally { finishBusy(); }
  }

  async function performAdminAction(action: string, payload: Record<string, unknown>, success: string): Promise<boolean> {
    if (!startBusy(action)) return false;
    try {
      const response = await postAdmin(action, payload);
      if (response.error) throw new Error(readError(response, t("Toiming ebaõnnestus.")));
      if (action === "support-start" && response.grant) setSupportGrant(response.grant);
      setMessage(success);
      await loadState(selectedTenantId);
      return true;
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : t("Toiming ebaõnnestus.")); return false; }
    finally { finishBusy(); }
  }

  function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const role = String(data.get("role") || "receptionist");
    const staffId = String(data.get("staffId") || "");
    const permissions = data.getAll("permission").map(String);
    void performAdminAction("invite", { tenantId: selected.tenantId, email: String(data.get("email") || "").trim(), role, staffId: staffId || null, permissions }, t("Kutse loodi."));
  }

  function submitRole(event: FormEvent<HTMLFormElement>, member: AdminMember) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const role = String(data.get("role"));
    void performAdminAction("change-role", { tenantId: selected?.tenantId, userId: member.userId, role, staffId: role === "staff" ? String(data.get("staffId") || "") || null : null }, t("Roll uuendati."));
  }

  function submitPermissions(event: FormEvent<HTMLFormElement>, member: AdminMember) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void performAdminAction("update-permissions", { tenantId: selected?.tenantId, userId: member.userId, permissions: data.getAll("permission").map(String) }, t("Õigused uuendati."));
  }

  const ownMemberships = useMemo(() => state?.memberships || [], [state?.memberships]);

  if (stateLoading && !state) return <main id="main-content" tabIndex={-1} data-live-language><h1>{t("Haldus")}</h1><p role="status">{t("Laadimine…")}</p></main>;

  if (resetToken && !resetHandled && !state?.user) return (
    <main id="main-content" tabIndex={-1} data-live-language>
      <h1>{t("Uue parooli määramine")}</h1>
      {message && <p role="alert">{t(message)}</p>}
      <form onSubmit={resetPassword}>
        <p><label htmlFor="reset-password">{t("Uus parool")}</label><br /><input id="reset-password" type="password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></p>
        <p><label htmlFor="reset-password-confirm">{t("Korda uut parooli")}</label><br /><input id="reset-password-confirm" type="password" minLength={12} value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} required /></p>
        <button type="submit" disabled={!!busy}>{t("Määra parool")}</button>
      </form>
    </main>
  );

  if (!state?.user) return (
    <main id="main-content" tabIndex={-1} data-live-language>
      <h1>{t("broneering.info haldus")}</h1>
      {message && <p role="alert">{t(message)}</p>}
      {stateError && <p role="alert">{stateError}</p>}
      {verificationEmail && <section><h2>{t("E-posti kinnitamine")}</h2><p>{t("Kinnituskiri on seotud aadressiga ")}{verificationEmail}.</p>{!mailAvailable && <p>{t("E-kirjade saatmine ei ole seadistatud, seega uut kinnituskirja praegu saata ei saa.")}</p>}<button type="button" onClick={() => void resendVerification(verificationEmail)} disabled={!!busy || !mailAvailable}>{t("Saada kinnituskiri uuesti")}</button></section>}
      {twoFactorView ? (
        <section>
          <h2>{t("Kaheastmeline autentimine")}</h2>
          <p>{t("Kui kontroll aegub või ebaõnnestub, alusta sisselogimist uuesti.")}</p>
          <button type="button" disabled={!!busy} onClick={() => { setTwoFactorView(false); setTwoFactorCode(""); setBackupCode(""); setLoginPassword(""); }}>{t("Tagasi sisselogimise juurde")}</button>
          <form onSubmit={verifyTwoFactor}>
            <p><label htmlFor="login-totp">{t("Autentimisrakenduse kood")}</label><br /><input id="login-totp" inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy}>{t("Kontrolli koodi")}</button>
          </form>
          <form onSubmit={verifyBackup}>
            <p><label htmlFor="login-backup">{t("Varukood")}</label><br /><input id="login-backup" value={backupCode} onChange={(event) => setBackupCode(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy}>{t("Kasuta varukoodi")}</button>
          </form>
        </section>
      ) : authView === "signup" && invitationActive ? (
        <section>
          <h2>{t("Loo konto kutsega")}</h2>
          {!mailAvailable && <p>{t("E-kirjade saatmine ei ole seadistatud. Konto loomine on ajutiselt keelatud.")}</p>}
          <form onSubmit={submitSignup}>
            <p><label htmlFor="signup-name">{t("Nimi")}</label><br /><input id="signup-name" value={signupName} onChange={(event) => setSignupName(event.target.value)} required /></p>
            <p><label htmlFor="signup-email">{t("E-post")}</label><br /><input id="signup-email" type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} required /></p>
            <p><label htmlFor="signup-password">{t("Parool (vähemalt 12 märki)")}</label><br /><input id="signup-password" type="password" minLength={12} value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy || !mailAvailable}>{t("Loo konto")}</button>
          </form>
          <p><button type="button" onClick={() => setAuthView("login")}>{t("Mul on juba konto")}</button></p>
        </section>
      ) : authView === "forgot" ? (
        <section>
          <h2>{t("Unustatud parool")}</h2>
          {!mailAvailable && <p>{t("E-kirjade saatmine ei ole seadistatud. Lähtestamist ei saa praegu taotleda.")}</p>}
          <form onSubmit={requestReset}>
            <p><label htmlFor="forgot-email">{t("E-post")}</label><br /><input id="forgot-email" type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy || !mailAvailable}>{t("Saada lähtestusjuhised")}</button>
          </form>
          <p><button type="button" onClick={() => setAuthView("login")}>{t("Tagasi sisselogimise juurde")}</button></p>
        </section>
      ) : (
        <section>
          <h2>{t("Logi sisse")}</h2>
          <form onSubmit={submitLogin}>
            <p><label htmlFor="login-email">{t("E-post")}</label><br /><input id="login-email" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required /></p>
            <p><label htmlFor="login-password">{t("Parool")}</label><br /><input id="login-password" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy}>{t("Logi sisse")}</button>
          </form>
          <p><button type="button" onClick={() => setAuthView("forgot")}>{t("Unustasin parooli")}</button></p>
          {invitationActive && <p><button type="button" onClick={() => setAuthView("signup")}>{t("Loo konto kutsega")}</button></p>}
        </section>
      )}
    </main>
  );

  if (!state.user.emailVerified) return (
    <main id="main-content" tabIndex={-1} data-live-language>
      <h1>{t("Haldus")}</h1>
      <p>{t("E-posti aadress tuleb enne halduse kasutamist kinnitada.")}</p>
      {message && <p role="alert">{t(message)}</p>}
      {!mailAvailable && <p>{t("E-kirjade saatmine ei ole seadistatud, seega uut kinnituskirja praegu saata ei saa.")}</p>}
      <button type="button" onClick={() => void resendVerification()} disabled={!!busy || !mailAvailable}>{t("Saada kinnituskiri uuesti")}</button>
      <p><button type="button" onClick={() => void signOut()} disabled={!!busy}>{t("Logi välja")}</button></p>
    </main>
  );

  return (
    <main id="main-content" tabIndex={-1} data-live-language>
      <header>
        <h1>{t("Haldus")}</h1>
        <p>{state.user.name} · {state.user.email}</p>
        <button type="button" onClick={() => void signOut()} disabled={!!busy}>{t("Logi välja")}</button>
      </header>
      {message && <p role="status">{t(message)}</p>}
      {stateError && <p role="alert">{stateError}</p>}
      {invitationError && <p role="alert">{invitationError}</p>}
      {invitationActive && !invitationHandled && <section aria-labelledby="invitation-title"><h2 id="invitation-title">{t("Kutse")}</h2><p>{t("Oled saanud kutse halduskeskkonda.")}</p><button type="button" onClick={() => void acceptInvitation()} disabled={!!busy}>{t("Võta kutse vastu")}</button></section>}

      <section aria-labelledby="security-title">
        <h2 id="security-title">{t("Turvalisus")}</h2>
        {requiresTwoFactor && <p role="alert">{t("Omanikud ja platvormi administraatorid peavad enne kaitstud sisu kasutamist kaheastmelise autentimise aktiveerima.")}</p>}
        {!state.user.twoFactorEnabled && !enrollment && <form onSubmit={enableTwoFactor}><h3>{t("Aktiveeri autentimisrakendus")}</h3><p><label htmlFor="enrollment-password">{t("Praegune parool")}</label><br /><input id="enrollment-password" type="password" value={enrollmentPassword} onChange={(event) => setEnrollmentPassword(event.target.value)} required /></p><button type="submit" disabled={!!busy}>{t("Alusta registreerimist")}</button></form>}
        {enrollment && <section><h3>{t("Lisa autentimisrakendus")}</h3><p>{t("Skaneerimise asemel sisesta rakendusse see võti käsitsi:")}</p><p><code>{enrollment.secret}</code></p><p><small>{t("Seadistus URI: ")}{enrollment.uri}</small></p><p>{t("Salvesta need varukoodid enne jätkamist:")}</p><ul>{enrollment.backupCodes.map((code) => <li key={code}><code>{code}</code></li>)}</ul><form onSubmit={verifyEnrollment}><p><label><input type="checkbox" checked={backupCodesSaved} onChange={(event) => setBackupCodesSaved(event.target.checked)} /> {t("Olen varukoodid turvaliselt salvestanud.")}</label></p><p><label htmlFor="enrollment-code">{t("Autentimisrakenduse kood")}</label><br /><input id="enrollment-code" inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} required /></p><button type="submit" disabled={!!busy || !backupCodesSaved}>{t("Kinnita autentimine")}</button></form></section>}
        {state.user.twoFactorEnabled && <form onSubmit={disableTwoFactor}><h3>{t("Vaheta autentimisrakendus")}</h3><p>{t("Keelamine nõuab praegust parooli. Pärast seda saad uue rakenduse kohe registreerida.")}</p><p><label htmlFor="replace-2fa-password">{t("Praegune parool")}</label><br /><input id="replace-2fa-password" type="password" value={replacePassword} onChange={(event) => setReplacePassword(event.target.value)} required /></p><button type="submit" disabled={!!busy}>{t("Keela ja registreeri uus")}</button></form>}
        <form onSubmit={changePassword}><h3>{t("Muuda parooli")}</h3><p><label htmlFor="current-password">{t("Praegune parool")}</label><br /><input id="current-password" type="password" value={changeCurrentPassword} onChange={(event) => setChangeCurrentPassword(event.target.value)} required /></p><p><label htmlFor="change-password">{t("Uus parool (vähemalt 12 märki)")}</label><br /><input id="change-password" type="password" minLength={12} value={changeNewPassword} onChange={(event) => setChangeNewPassword(event.target.value)} required /></p><p><label htmlFor="change-password-confirm">{t("Korda uut parooli")}</label><br /><input id="change-password-confirm" type="password" minLength={12} value={changeNewPasswordConfirmation} onChange={(event) => setChangeNewPasswordConfirmation(event.target.value)} required /></p><button type="submit" disabled={!!busy}>{t("Muuda parooli")}</button></form>
      </section>

      {requiresTwoFactor ? <p>{t("Kaitstud halduse sisu avaneb pärast kaheastmelise autentimise aktiveerimist.")}</p> : (
        <>
          {state.user.isPlatformAdmin && <CompanyProvisioning onCreated={()=>void loadState()}/>}
          {state.user.isPlatformAdmin && <OwnerInvitationRecovery tenants={state.platformTenants??[]}/>}
          {state.user.isPlatformAdmin && <SubscriptionManagement tenants={state.platformTenants??[]}/>}
          {state.user.isPlatformAdmin && <BillingIssuer/>}
          {ownMemberships.length > 0 && <section aria-labelledby="context-title"><h2 id="context-title">{t("Minu ettevõtted")}</h2><label htmlFor="tenant-context">{t("Vali enda kontekst")}</label><br /><select id="tenant-context" value={selectedTenantId || selected?.tenantId || ""} onChange={(event) => setSelectedTenantId(event.target.value)}>{ownMemberships.map((membership) => <option key={membership.tenantId} value={membership.tenantId}>{membership.tenantName} ({t(roleLabel(membership.role))})</option>)}</select></section>}
          {selected && <section aria-labelledby="workspace-title"><h2 id="workspace-title">{selected.tenantName}</h2><p>{t("Roll: ")}{t(roleLabel(selected.role))}</p>
            <p><button type="button" disabled={!!busy} onClick={()=>window.location.reload()}>{t("Laadi haldus uuesti")}</button> {t("(salvestamata vormid lähtestatakse)")}</p>
            {selected.role==='owner'&&<RetentionSettings tenantId={selected.tenantId} key={'retention:'+selected.tenantId}/>}
            {selected.role==='owner'&&<CompanyExit tenantId={selected.tenantId} key={'exit:'+selected.tenantId} onChanged={()=>void loadState()}/>}
            {selected.dataAccessExpired?<p role="status">{t('Ettevõtte ajutine andmeligipääs on lõppenud. Võta ühendust platvormi haldajaga.')}</p>:<>
            {scheduleConflicts&&<div role="alert"><h3>{t("Graafikumuudatuse konfliktid (")}{scheduleConflicts.total})</h3><p>{t("Broneeringud ja graafik jäid muutmata. Loendis on kuni 30 mõjutatud broneeringut; kliendi kontaktandmeid siin ei kuvata.")}</p><ul>{scheduleConflicts.items.map(item=><li key={item.reference}>{item.reference} · {item.staffName} · {new Date(item.start).toLocaleString(localeTags[locale],{timeZone:state.schedules?.rules.timezone??'Europe/Tallinn'})}–{new Date(item.end).toLocaleTimeString(localeTags[locale],{timeZone:state.schedules?.rules.timezone??'Europe/Tallinn'})}</li>)}</ul></div>}
            <LanguageSettings key={'language:'+selected.tenantId} tenantId={selected.tenantId} owner={selected.role==='owner'}/>
            <BookingManagement key={'bookings:'+selected.tenantId+':'+state.user.id} tenantId={selected.tenantId} userId={state.user.id}/>
            {selected.role!=='staff'&&<CustomerManagement key={'customers:'+selected.tenantId} tenantId={selected.tenantId}/>}
            {state.schedules&&<ScheduleManagement key={'schedules:'+selected.tenantId} tenantId={selected.tenantId} state={state.schedules} busy={!!busy} save={(action,payload)=>performAdminAction(action,payload,t("Graafiku muudatus on salvestatud."))}/>}
            {state.catalog && <ServiceManagement key={'catalog:'+selected.tenantId} tenantId={selected.tenantId} catalog={state.catalog} busy={!!busy} save={(action,payload)=>performAdminAction(action,payload,t("Hinnakirja muudatus on salvestatud."))}/>}
              {selected.role === "owner" && <>
                <Onboarding tenantId={selected.tenantId} key={'onboarding:'+selected.tenantId}/>
                <ExportManagement tenantId={selected.tenantId} key={'exports:'+selected.tenantId}/>
                <SubscriptionManagement tenantId={selected.tenantId} key={'billing:'+selected.tenantId}/>
                <ImportManagement tenantId={selected.tenantId} key={'imports:'+selected.tenantId}/>
                <NotificationSettings tenantId={selected.tenantId} key={'notifications:'+selected.tenantId}/>
              <ServiceTranslations tenantId={selected.tenantId} key={'translations:'+selected.tenantId} revision={JSON.stringify(state.catalog?.services)??''}/>
              {state.embedding && <EmbeddingSettingsForm key={`${selected.tenantId}:${state.embedding.origins.join('|')}`} tenantId={selected.tenantId} settings={state.embedding} onSave={origins=>performAdminAction('embedding-settings',{tenantId:selected.tenantId,origins},t("Lubatud kodulehed on salvestatud."))}/>}
              <h3>{t("Liikmed")}</h3>
              <div className="table-scroll" role="region" aria-label={t("Liikmed")} tabIndex={0}><table>
                <thead><tr><th>{t("Nimi")}</th><th>{t("E-post")}</th><th>{t("Roll")}</th><th>{t("Aktiivne")}</th><th>{t("MFA")}</th><th>{t("Toimingud")}</th></tr></thead>
                <tbody>{(state.members || []).map((member) => <tr key={member.userId}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{t(roleLabel(member.role))}</td>
                  <td>{member.active ? t("jah") : t("ei")}</td>
                  <td>{member.twoFactorEnabled ? t("jah") : t("ei")}</td>
                  <td>{member.role === "owner" ? <span>{t("Omaniku konto")}</span> : <><form onSubmit={(event) => submitRole(event, member)}><label>{t("Roll ")}<select name="role" defaultValue={member.role}><option value="receptionist">{t("Vastuvõtt")}</option><option value="staff">{t("Töötaja")}</option></select></label> <label>{t("Töötaja ")}<select name="staffId" defaultValue={member.staffId || ""}><option value="">{t("Puudub")}</option>{(state.staff || []).map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></label> <button type="submit" disabled={!!busy}>{t("Salvesta roll")}</button></form><form onSubmit={(event) => submitPermissions(event, member)}><span>{t("Õigused: ")}</span>{delegationOptions.filter((option) => option.role === member.role).map((option) => <label key={option.permission}><input type="checkbox" name="permission" value={option.permission} defaultChecked={member.permissions.includes(option.permission)} /> {t(option.label)}</label>)} <button type="submit" disabled={!!busy}>{t("Salvesta õigused")}</button></form><button type="button" disabled={!!busy} onClick={() => { if (window.confirm(t("Kas tühistada selle liikme juurdepääs?"))) void performAdminAction("revoke-member", { tenantId: selected.tenantId, userId: member.userId }, t("Liikme juurdepääs tühistati.")); }}>{t("Tühista juurdepääs")}</button></>}</td>
                </tr>)}</tbody>
              </table></div>
              <h3>{t("Kutsu liige")}</h3>
              {!state.mailAvailable && <p>{t("E-kirjade saatmine ei ole seadistatud. Kutseid ei saa saata.")}</p>}
              <form onSubmit={submitInvitation}><p><label htmlFor="invite-email">{t("E-post")}</label><br /><input id="invite-email" name="email" type="email" required /></p><p><label htmlFor="invite-role">{t("Roll")}</label><br /><select id="invite-role" name="role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "receptionist" | "staff")}><option value="receptionist">{t("Vastuvõtt")}</option><option value="staff">{t("Töötaja")}</option></select></p><p><label htmlFor="invite-staff">{t("Töötaja profiil")}</label><br /><select id="invite-staff" name="staffId" defaultValue=""><option value="">{t("Puudub")}</option>{(state.staff || []).map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></p>{delegationOptions.filter((option) => option.role === inviteRole).map((option) => <label key={option.permission}><input type="checkbox" name="permission" value={option.permission} /> {t(option.label)}</label>)}<p><button type="submit" disabled={!!busy || !state.mailAvailable}>{t("Saada kutse")}</button></p></form>
              <h3>{t("Kutsed")}</h3><ul>{(state.invitations || []).map((invitation: AdminInvitation) => <li key={invitation.id}>{invitation.email} · {t(roleLabel(invitation.role))} {t("· aegub ")}{invitation.expiresAt} <button type="button" disabled={!!busy} onClick={() => { if (window.confirm(t("Kas tühistada see kutse?"))) void performAdminAction("cancel-invitation", { tenantId: selected.tenantId, invitationId: invitation.id }, t("Kutse tühistati.")); }}>{t("Tühista kutse")}</button></li>)}</ul>
              <h3>{t("Omaniku üleandmine")}</h3><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void performAdminAction("transfer-owner", { tenantId: selected.tenantId, newOwnerUserId: String(data.get("newOwnerUserId")) }, t("Omand anti üle. Logi uuesti sisse.")); }}><label>{t("Uus omanik ")}<select name="newOwnerUserId" required><option value="">{t("Vali liige")}</option>{(state.members || []).filter((member) => member.userId !== state.user?.id && member.active && member.twoFactorEnabled).map((member) => <option key={member.userId} value={member.userId}>{member.name} ({member.email})</option>)}</select></label> <button type="submit" disabled={!!busy}>{t("Anna üle")}</button></form>
            </>}
          </>}
          </section>}
          {state.user.isPlatformAdmin && <section aria-labelledby="platform-title"><h2 id="platform-title">{t("Platvorm")}</h2><p>{t("Platvormi tugi annab ajutise ainult lugemise ligipääsu valitud ettevõtte kontekstile.")}</p><ul>{(state.platformTenants || []).map((tenant) => <li key={tenant.id}>{tenant.name} ({tenant.slug}) · {tenant.active ? "aktiivne" : "peatatud"} <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void performAdminAction("support-start", { tenantId: tenant.id, reason: String(data.get("reason") || "") }, t("Toe ligipääs avati.")); }}><label htmlFor={`support-reason-${tenant.id}`}>{t("Põhjus")}</label><br /><input id={`support-reason-${tenant.id}`} name="reason" minLength={10} required /><button type="submit" disabled={!!busy}>{t("Alusta tuge")}</button></form></li>)}</ul>{supportGrant && <p>{t("Toe ligipääs: ")}{supportGrant.id}{t(", aegub ")}{supportGrant.expiresAt} <button type="button" onClick={() => { void performAdminAction("support-stop", { grantId: supportGrant.id }, t("Toe ligipääs lõpetati.")).then((ok) => { if (ok) setSupportGrant(null); }); }} disabled={!!busy}>{t("Lõpeta tugi")}</button></p>}</section>}
        </>
      )}
    </main>
  );
}
