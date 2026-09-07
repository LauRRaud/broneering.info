"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { delegationOptions, type AdminInvitation, type AdminMember, type AdminRole, type AdminState } from "@/lib/admin-contracts";

type AdminAppProps = {
  invitationToken?: string;
  resetToken?: string;
  authError?: string;
  initialLogin?: boolean;
};

type AdminResponse = { ok?: boolean; error?: string; code?: string; tenantId?: string; grant?: { id: string; expiresAt: string } };

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
  const [state, setState] = useState<AdminState | null>(null);
  const [stateLoading, setStateLoading] = useState(true);
  const [stateError, setStateError] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [message, setMessage] = useState(authError);
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
      if (!response.ok) throw new Error(readError(body, "Haldusandmete laadimine ebaõnnestus."));
      if (currentRequest !== stateRequest.current) return;
      setState(body);
      if (!tenantId && !selectedTenantId) setSelectedTenantId(body.selected?.tenantId || body.memberships[0]?.tenantId || "");
    } catch (error: unknown) {
      if (controller.signal.aborted || currentRequest !== stateRequest.current) return;
      setStateError(error instanceof Error ? error.message : "Haldusandmete laadimine ebaõnnestus.");
    } finally {
      if (currentRequest === stateRequest.current) setStateLoading(false);
    }
  }

  useEffect(() => { void loadState(); }, [selectedTenantId]);

  async function postAdmin(action: string, payload: Record<string, unknown>): Promise<AdminResponse> {
    const response = await fetch(`/api/admin/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    let body: AdminResponse = {};
    try { body = (await response.json()) as AdminResponse; } catch { body = {}; }
    if (!response.ok) throw new Error(readError(body, "Toiming ebaõnnestus."));
    return body;
  }

  function startBusy(name: string) {
    if (busyRef.current || busy) return false;
    busyRef.current = true;
    setBusy(name);
    setMessage("");
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
        throw new Error(errorMessage(response, "Sisselogimine ebaõnnestus."));
      }
      if ((response.data as { twoFactorRedirect?: boolean } | null | undefined)?.twoFactorRedirect) {
        setTwoFactorView(true);
        setMessage("Sisesta autentimisrakenduse kood või varukood.");
      } else {
        setLoginPassword("");
        await loadState();
      }
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Sisselogimine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitationToken || !invitationActive) { setMessage("Uus konto on võimalik luua ainult kutsega."); return; }
    if (signupPassword.length < 12) { setMessage("Parool peab olema vähemalt 12 märki."); return; }
    if (!mailAvailable) { setMessage("E-kirjade saatmine ei ole seadistatud; registreerumist ei saa praegu lõpetada."); return; }
    if (!startBusy("signup")) return;
    try {
      const callbackURL = `${window.location.origin}/?login=1&invitation=${encodeURIComponent(invitationToken)}`;
      const response = await authClient.signUp.email({ name: signupName.trim(), email: signupEmail.trim(), password: signupPassword, callbackURL, fetchOptions: { headers: { "x-invitation-token": invitationToken } } });
      if (response.error) throw new Error(errorMessage(response, "Konto loomine ebaõnnestus."));
      setMessage("Konto loodi. Kinnita oma e-posti aadress enne sisselogimist.");
      setVerificationEmail(signupEmail.trim());
      setAuthView("login");
      setLoginEmail(signupEmail);
      setSignupPassword("");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Konto loomine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function resendVerification(email = state?.user?.email) {
    if (!email || !mailAvailable || !startBusy("verification")) return;
    try {
      const callback = new URL(window.location.href);
      callback.searchParams.set("login", "1");
      const response = await authClient.sendVerificationEmail({ email, callbackURL: callback.toString() });
      if (response.error) throw new Error(errorMessage(response, "Kinnituskirja saatmine ebaõnnestus."));
      setMessage("Kinnituskiri saadeti uuesti.");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Kinnituskirja saatmine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function requestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mailAvailable) { setMessage("E-kirjade saatmine ei ole seadistatud; parooli lähtestamist ei saa praegu taotleda."); return; }
    if (!startBusy("forgot")) return;
    try {
      const response = await authClient.requestPasswordReset({ email: forgotEmail.trim(), redirectTo: `${window.location.origin}/?reset=1` });
      if (response.error) throw new Error(errorMessage(response, "Lähtestuskirja taotlemine ebaõnnestus."));
      setMessage("Kui aadress on süsteemis olemas, saadetakse sellele lähtestusjuhised.");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Lähtestuskirja taotlemine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 12 || newPassword !== newPasswordConfirmation) { setMessage("Uus parool peab olema vähemalt 12 märki ja kinnitused peavad ühtima."); return; }
    if (!startBusy("reset")) return;
    try {
      const response = await authClient.resetPassword({ newPassword, token: resetToken });
      if (response.error) throw new Error(errorMessage(response, "Parooli lähtestamine ebaõnnestus."));
      setMessage("Parool on muudetud. Logi uue parooliga sisse.");
      setResetHandled(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      setNewPassword("");
      setNewPasswordConfirmation("");
      setAuthView("login");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Parooli lähtestamine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function verifyTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startBusy("two-factor")) return;
    try {
      const response = await authClient.twoFactor.verifyTotp({ code: twoFactorCode.trim() });
      if (response.error) throw new Error(errorMessage(response, "Autentimiskoodi kontroll ebaõnnestus."));
      setTwoFactorView(false);
      setTwoFactorCode("");
      await loadState();
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Autentimiskoodi kontroll ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function verifyBackup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startBusy("backup-code")) return;
    try {
      const response = await authClient.twoFactor.verifyBackupCode({ code: backupCode.trim() });
      if (response.error) throw new Error(errorMessage(response, "Varukoodi kontroll ebaõnnestus."));
      setTwoFactorView(false);
      setBackupCode("");
      await loadState();
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Varukoodi kontroll ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function enableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startBusy("enroll")) return;
    try {
      const response = await authClient.twoFactor.enable({ password: enrollmentPassword, method: "totp" });
      const enrollmentData = response.data as { totpURI?: string; backupCodes?: string[] } | null | undefined;
      if (response.error || !enrollmentData?.totpURI) throw new Error(errorMessage(response, "Kaheastmelise autentimise alustamine ebaõnnestus."));
      let secret = enrollmentData.totpURI;
      try { secret = new URL(enrollmentData.totpURI).searchParams.get("secret") || enrollmentData.totpURI; } catch { /* Keep the URI as the manual setup value. */ }
      setEnrollment({ uri: enrollmentData.totpURI, secret, backupCodes: enrollmentData.backupCodes || [] });
      setEnrollmentPassword("");
      setMessage("Lisa autentimisrakendus käsitsi antud võtme abil ja salvesta varukoodid.");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Kaheastmelise autentimise alustamine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!backupCodesSaved) { setMessage("Kinnita, et varukoodid on turvaliselt salvestatud."); return; }
    if (!startBusy("enroll-verify")) return;
    try {
      const response = await authClient.twoFactor.verifyTotp({ code: twoFactorCode.trim() });
      if (response.error) throw new Error(errorMessage(response, "Autentimisrakenduse koodi kontroll ebaõnnestus."));
      setEnrollment(null);
      setBackupCodesSaved(false);
      setTwoFactorCode("");
      setMessage("Kaheastmeline autentimine on aktiveeritud.");
      await loadState();
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Autentimisrakenduse koodi kontroll ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function disableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startBusy("disable-2fa")) return;
    try {
      const response = await authClient.twoFactor.disable({ password: replacePassword });
      if (response.error) throw new Error(errorMessage(response, "Autentimise keelamine ebaõnnestus."));
      setReplacePassword("");
      setMessage("Autentimine on keelatud. Võid kohe uue autentimisrakenduse registreerida.");
      await loadState();
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Autentimise keelamine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changeNewPassword.length < 12 || changeNewPassword !== changeNewPasswordConfirmation) { setMessage("Uus parool peab olema vähemalt 12 märki ja kinnitused peavad ühtima."); return; }
    if (!startBusy("change-password")) return;
    try {
      const response = await authClient.changePassword({ currentPassword: changeCurrentPassword, newPassword: changeNewPassword, revokeOtherSessions: true });
      if (response.error) throw new Error(errorMessage(response, "Parooli muutmine ebaõnnestus."));
      setChangeCurrentPassword("");
      setChangeNewPassword("");
      setChangeNewPasswordConfirmation("");
      setMessage("Parool on muudetud ja teised seansid lõpetatud.");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Parooli muutmine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function signOut() {
    if (!startBusy("signout")) return;
    try {
      const response = await authClient.signOut();
      if (response.error) throw new Error(errorMessage(response, "Väljalogimine ebaõnnestus."));
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
      setMessage("Oled välja logitud.");
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Väljalogimine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function acceptInvitation() {
    if (!invitationToken || !invitationActive || invitationHandled || !state?.user?.emailVerified || !startBusy("accept-invitation")) return;
    try {
      const response = await postAdmin("accept-invitation", { token: invitationToken });
      if (response.error) throw new Error(readError(response, "Kutse vastuvõtmine ebaõnnestus."));
      setInvitationHandled(true);
      setInvitationError("");
      setMessage("Kutse võeti vastu.");
      const url = new URL(window.location.href);
      url.searchParams.delete("invitation");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
      setInvitationActive(false);
      if (response.tenantId && response.tenantId !== selectedTenantId) setSelectedTenantId(response.tenantId);
      else await loadState(response.tenantId || selectedTenantId);
    } catch (error: unknown) { setInvitationError(error instanceof Error ? error.message : "Kutse vastuvõtmine ebaõnnestus."); }
    finally { finishBusy(); }
  }

  async function performAdminAction(action: string, payload: Record<string, unknown>, success: string): Promise<boolean> {
    if (!startBusy(action)) return false;
    try {
      const response = await postAdmin(action, payload);
      if (response.error) throw new Error(readError(response, "Toiming ebaõnnestus."));
      if (action === "support-start" && response.grant) setSupportGrant(response.grant);
      setMessage(success);
      await loadState(selectedTenantId);
      return true;
    } catch (error: unknown) { setMessage(error instanceof Error ? error.message : "Toiming ebaõnnestus."); return false; }
    finally { finishBusy(); }
  }

  function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const role = String(data.get("role") || "receptionist");
    const staffId = String(data.get("staffId") || "");
    const permissions = data.getAll("permission").map(String);
    void performAdminAction("invite", { tenantId: selected.tenantId, email: String(data.get("email") || "").trim(), role, staffId: staffId || null, permissions }, "Kutse loodi.");
  }

  function submitRole(event: FormEvent<HTMLFormElement>, member: AdminMember) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const role = String(data.get("role"));
    void performAdminAction("change-role", { tenantId: selected?.tenantId, userId: member.userId, role, staffId: role === "staff" ? String(data.get("staffId") || "") || null : null }, "Roll uuendati.");
  }

  function submitPermissions(event: FormEvent<HTMLFormElement>, member: AdminMember) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void performAdminAction("update-permissions", { tenantId: selected?.tenantId, userId: member.userId, permissions: data.getAll("permission").map(String) }, "Õigused uuendati.");
  }

  const ownMemberships = useMemo(() => state?.memberships || [], [state?.memberships]);

  if (stateLoading && !state) return <main><h1>Haldus</h1><p role="status">Laadimine…</p></main>;

  if (resetToken && !resetHandled && !state?.user) return (
    <main>
      <h1>Uue parooli määramine</h1>
      {message && <p role="alert">{message}</p>}
      <form onSubmit={resetPassword}>
        <p><label htmlFor="reset-password">Uus parool</label><br /><input id="reset-password" type="password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></p>
        <p><label htmlFor="reset-password-confirm">Korda uut parooli</label><br /><input id="reset-password-confirm" type="password" minLength={12} value={newPasswordConfirmation} onChange={(event) => setNewPasswordConfirmation(event.target.value)} required /></p>
        <button type="submit" disabled={!!busy}>Määra parool</button>
      </form>
    </main>
  );

  if (!state?.user) return (
    <main>
      <h1>broneering.info haldus</h1>
      {message && <p role="alert">{message}</p>}
      {stateError && <p role="alert">{stateError}</p>}
      {verificationEmail && <section><h2>E-posti kinnitamine</h2><p>Kinnituskiri on seotud aadressiga {verificationEmail}.</p>{!mailAvailable && <p>E-kirjade saatmine ei ole seadistatud, seega uut kinnituskirja praegu saata ei saa.</p>}<button type="button" onClick={() => void resendVerification(verificationEmail)} disabled={!!busy || !mailAvailable}>Saada kinnituskiri uuesti</button></section>}
      {twoFactorView ? (
        <section>
          <h2>Kaheastmeline autentimine</h2>
          <p>Kui kontroll aegub või ebaõnnestub, alusta sisselogimist uuesti.</p>
          <button type="button" disabled={!!busy} onClick={() => { setTwoFactorView(false); setTwoFactorCode(""); setBackupCode(""); setLoginPassword(""); }}>Tagasi sisselogimise juurde</button>
          <form onSubmit={verifyTwoFactor}>
            <p><label htmlFor="login-totp">Autentimisrakenduse kood</label><br /><input id="login-totp" inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy}>Kontrolli koodi</button>
          </form>
          <form onSubmit={verifyBackup}>
            <p><label htmlFor="login-backup">Varukood</label><br /><input id="login-backup" value={backupCode} onChange={(event) => setBackupCode(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy}>Kasuta varukoodi</button>
          </form>
        </section>
      ) : authView === "signup" && invitationActive ? (
        <section>
          <h2>Loo konto kutsega</h2>
          {!mailAvailable && <p>E-kirjade saatmine ei ole seadistatud. Konto loomine on ajutiselt keelatud.</p>}
          <form onSubmit={submitSignup}>
            <p><label htmlFor="signup-name">Nimi</label><br /><input id="signup-name" value={signupName} onChange={(event) => setSignupName(event.target.value)} required /></p>
            <p><label htmlFor="signup-email">E-post</label><br /><input id="signup-email" type="email" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} required /></p>
            <p><label htmlFor="signup-password">Parool (vähemalt 12 märki)</label><br /><input id="signup-password" type="password" minLength={12} value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy || !mailAvailable}>Loo konto</button>
          </form>
          <p><button type="button" onClick={() => setAuthView("login")}>Mul on juba konto</button></p>
        </section>
      ) : authView === "forgot" ? (
        <section>
          <h2>Unustatud parool</h2>
          {!mailAvailable && <p>E-kirjade saatmine ei ole seadistatud. Lähtestamist ei saa praegu taotleda.</p>}
          <form onSubmit={requestReset}>
            <p><label htmlFor="forgot-email">E-post</label><br /><input id="forgot-email" type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy || !mailAvailable}>Saada lähtestusjuhised</button>
          </form>
          <p><button type="button" onClick={() => setAuthView("login")}>Tagasi sisselogimise juurde</button></p>
        </section>
      ) : (
        <section>
          <h2>Logi sisse</h2>
          <form onSubmit={submitLogin}>
            <p><label htmlFor="login-email">E-post</label><br /><input id="login-email" type="email" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required /></p>
            <p><label htmlFor="login-password">Parool</label><br /><input id="login-password" type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /></p>
            <button type="submit" disabled={!!busy}>Logi sisse</button>
          </form>
          <p><button type="button" onClick={() => setAuthView("forgot")}>Unustasin parooli</button></p>
          {invitationActive && <p><button type="button" onClick={() => setAuthView("signup")}>Loo konto kutsega</button></p>}
        </section>
      )}
    </main>
  );

  if (!state.user.emailVerified) return (
    <main>
      <h1>Haldus</h1>
      <p>E-posti aadress tuleb enne halduse kasutamist kinnitada.</p>
      {message && <p role="alert">{message}</p>}
      {!mailAvailable && <p>E-kirjade saatmine ei ole seadistatud, seega uut kinnituskirja praegu saata ei saa.</p>}
      <button type="button" onClick={() => void resendVerification()} disabled={!!busy || !mailAvailable}>Saada kinnituskiri uuesti</button>
      <p><button type="button" onClick={() => void signOut()} disabled={!!busy}>Logi välja</button></p>
    </main>
  );

  return (
    <main>
      <header>
        <h1>Haldus</h1>
        <p>{state.user.name} · {state.user.email}</p>
        <button type="button" onClick={() => void signOut()} disabled={!!busy}>Logi välja</button>
      </header>
      {message && <p role="status">{message}</p>}
      {stateError && <p role="alert">{stateError}</p>}
      {invitationError && <p role="alert">{invitationError}</p>}
      {invitationActive && !invitationHandled && <section aria-labelledby="invitation-title"><h2 id="invitation-title">Kutse</h2><p>Oled saanud kutse halduskeskkonda.</p><button type="button" onClick={() => void acceptInvitation()} disabled={!!busy}>Võta kutse vastu</button></section>}

      <section aria-labelledby="security-title">
        <h2 id="security-title">Turvalisus</h2>
        {requiresTwoFactor && <p role="alert">Omanikud ja platvormi administraatorid peavad enne kaitstud sisu kasutamist kaheastmelise autentimise aktiveerima.</p>}
        {!state.user.twoFactorEnabled && !enrollment && <form onSubmit={enableTwoFactor}><h3>Aktiveeri autentimisrakendus</h3><p><label htmlFor="enrollment-password">Praegune parool</label><br /><input id="enrollment-password" type="password" value={enrollmentPassword} onChange={(event) => setEnrollmentPassword(event.target.value)} required /></p><button type="submit" disabled={!!busy}>Alusta registreerimist</button></form>}
        {enrollment && <section><h3>Lisa autentimisrakendus</h3><p>Skaneerimise asemel sisesta rakendusse see võti käsitsi:</p><p><code>{enrollment.secret}</code></p><p><small>Seadistus URI: {enrollment.uri}</small></p><p>Salvesta need varukoodid enne jätkamist:</p><ul>{enrollment.backupCodes.map((code) => <li key={code}><code>{code}</code></li>)}</ul><form onSubmit={verifyEnrollment}><p><label><input type="checkbox" checked={backupCodesSaved} onChange={(event) => setBackupCodesSaved(event.target.checked)} /> Olen varukoodid turvaliselt salvestanud.</label></p><p><label htmlFor="enrollment-code">Autentimisrakenduse kood</label><br /><input id="enrollment-code" inputMode="numeric" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value)} required /></p><button type="submit" disabled={!!busy || !backupCodesSaved}>Kinnita autentimine</button></form></section>}
        {state.user.twoFactorEnabled && <form onSubmit={disableTwoFactor}><h3>Vaheta autentimisrakendus</h3><p>Keelamine nõuab praegust parooli. Pärast seda saad uue rakenduse kohe registreerida.</p><p><label htmlFor="replace-2fa-password">Praegune parool</label><br /><input id="replace-2fa-password" type="password" value={replacePassword} onChange={(event) => setReplacePassword(event.target.value)} required /></p><button type="submit" disabled={!!busy}>Keela ja registreeri uus</button></form>}
        <form onSubmit={changePassword}><h3>Muuda parooli</h3><p><label htmlFor="current-password">Praegune parool</label><br /><input id="current-password" type="password" value={changeCurrentPassword} onChange={(event) => setChangeCurrentPassword(event.target.value)} required /></p><p><label htmlFor="change-password">Uus parool (vähemalt 12 märki)</label><br /><input id="change-password" type="password" minLength={12} value={changeNewPassword} onChange={(event) => setChangeNewPassword(event.target.value)} required /></p><p><label htmlFor="change-password-confirm">Korda uut parooli</label><br /><input id="change-password-confirm" type="password" minLength={12} value={changeNewPasswordConfirmation} onChange={(event) => setChangeNewPasswordConfirmation(event.target.value)} required /></p><button type="submit" disabled={!!busy}>Muuda parooli</button></form>
      </section>

      {requiresTwoFactor ? <p>Kaitstud halduse sisu avaneb pärast kaheastmelise autentimise aktiveerimist.</p> : (
        <>
          {ownMemberships.length > 0 && <section aria-labelledby="context-title"><h2 id="context-title">Minu ettevõtted</h2><label htmlFor="tenant-context">Vali enda kontekst</label><br /><select id="tenant-context" value={selectedTenantId || selected?.tenantId || ""} onChange={(event) => setSelectedTenantId(event.target.value)}>{ownMemberships.map((membership) => <option key={membership.tenantId} value={membership.tenantId}>{membership.tenantName} ({roleLabel(membership.role)})</option>)}</select></section>}
          {selected && <section aria-labelledby="workspace-title"><h2 id="workspace-title">{selected.tenantName}</h2><p>Roll: {roleLabel(selected.role)}</p><p>Kalenderivaade ei ole veel rakendatud.</p>
            {selected.role === "owner" && <>
              <h3>Liikmed</h3>
              <table>
                <thead><tr><th>Nimi</th><th>E-post</th><th>Roll</th><th>Aktiivne</th><th>MFA</th><th>Toimingud</th></tr></thead>
                <tbody>{(state.members || []).map((member) => <tr key={member.userId}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{roleLabel(member.role)}</td>
                  <td>{member.active ? "jah" : "ei"}</td>
                  <td>{member.twoFactorEnabled ? "jah" : "ei"}</td>
                  <td>{member.role === "owner" ? <span>Omaniku konto</span> : <><form onSubmit={(event) => submitRole(event, member)}><label>Roll <select name="role" defaultValue={member.role}><option value="receptionist">Vastuvõtt</option><option value="staff">Töötaja</option></select></label> <label>Töötaja <select name="staffId" defaultValue={member.staffId || ""}><option value="">Puudub</option>{(state.staff || []).map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></label> <button type="submit" disabled={!!busy}>Salvesta roll</button></form><form onSubmit={(event) => submitPermissions(event, member)}><span>Õigused: </span>{delegationOptions.filter((option) => option.role === member.role).map((option) => <label key={option.permission}><input type="checkbox" name="permission" value={option.permission} defaultChecked={member.permissions.includes(option.permission)} /> {option.label}</label>)} <button type="submit" disabled={!!busy}>Salvesta õigused</button></form><button type="button" disabled={!!busy} onClick={() => { if (window.confirm("Kas tühistada selle liikme juurdepääs?")) void performAdminAction("revoke-member", { tenantId: selected.tenantId, userId: member.userId }, "Liikme juurdepääs tühistati."); }}>Tühista juurdepääs</button></>}</td>
                </tr>)}</tbody>
              </table>
              <h3>Kutsu liige</h3>
              {!state.mailAvailable && <p>E-kirjade saatmine ei ole seadistatud. Kutseid ei saa saata.</p>}
              <form onSubmit={submitInvitation}><p><label htmlFor="invite-email">E-post</label><br /><input id="invite-email" name="email" type="email" required /></p><p><label htmlFor="invite-role">Roll</label><br /><select id="invite-role" name="role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "receptionist" | "staff")}><option value="receptionist">Vastuvõtt</option><option value="staff">Töötaja</option></select></p><p><label htmlFor="invite-staff">Töötaja profiil</label><br /><select id="invite-staff" name="staffId" defaultValue=""><option value="">Puudub</option>{(state.staff || []).map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></p>{delegationOptions.filter((option) => option.role === inviteRole).map((option) => <label key={option.permission}><input type="checkbox" name="permission" value={option.permission} /> {option.label}</label>)}<p><button type="submit" disabled={!!busy || !state.mailAvailable}>Saada kutse</button></p></form>
              <h3>Kutsed</h3><ul>{(state.invitations || []).map((invitation: AdminInvitation) => <li key={invitation.id}>{invitation.email} · {roleLabel(invitation.role)} · aegub {invitation.expiresAt} <button type="button" disabled={!!busy} onClick={() => { if (window.confirm("Kas tühistada see kutse?")) void performAdminAction("cancel-invitation", { tenantId: selected.tenantId, invitationId: invitation.id }, "Kutse tühistati."); }}>Tühista kutse</button></li>)}</ul>
              <h3>Omaniku üleandmine</h3><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void performAdminAction("transfer-owner", { tenantId: selected.tenantId, newOwnerUserId: String(data.get("newOwnerUserId")) }, "Omand anti üle. Logi uuesti sisse."); }}><label>Uus omanik <select name="newOwnerUserId" required><option value="">Vali liige</option>{(state.members || []).filter((member) => member.userId !== state.user?.id && member.active && member.twoFactorEnabled).map((member) => <option key={member.userId} value={member.userId}>{member.name} ({member.email})</option>)}</select></label> <button type="submit" disabled={!!busy}>Anna üle</button></form>
            </>}
          </section>}
          {state.user.isPlatformAdmin && <section aria-labelledby="platform-title"><h2 id="platform-title">Platvorm</h2><p>Platvormi tugi annab ajutise ainult lugemise ligipääsu valitud ettevõtte kontekstile.</p><ul>{(state.platformTenants || []).map((tenant) => <li key={tenant.id}>{tenant.name} ({tenant.slug}) · {tenant.active ? "aktiivne" : "peatatud"} <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void performAdminAction("support-start", { tenantId: tenant.id, reason: String(data.get("reason") || "") }, "Toe ligipääs avati."); }}><label htmlFor={`support-reason-${tenant.id}`}>Põhjus</label><br /><input id={`support-reason-${tenant.id}`} name="reason" minLength={10} required /><button type="submit" disabled={!!busy}>Alusta tuge</button></form></li>)}</ul>{supportGrant && <p>Toe ligipääs: {supportGrant.id}, aegub {supportGrant.expiresAt} <button type="button" onClick={() => { void performAdminAction("support-stop", { grantId: supportGrant.id }, "Toe ligipääs lõpetati.").then((ok) => { if (ok) setSupportGrant(null); }); }} disabled={!!busy}>Lõpeta tugi</button></p>}</section>}
        </>
      )}
    </main>
  );
}
