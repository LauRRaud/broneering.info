export type Service = { id: string; name: string; description: string; category: string; priceFrom: number; durationFrom: number };
export type Staff = { id: string; name: string; title: string; bio?: string; photoUrl?: string; serviceIds: string[] };
export type Catalog = { tenant: { name: string; slug: string; address: string; timezone: string; description: string; cancellationHours: number; rulesVersion:number; demo: boolean }; services: Service[]; staff: Staff[]; today: string; maxDate: string; selectedStaffId?: string };
export type NextAvailability = { date: string | null; searchedThrough: string; hasMore: boolean };
export type Offer = { staffId: string; staffName: string; serviceId: string; start: string; end: string; price: number; duration: number };
export type BookingInput = { serviceId: string; staffId: string; start: string; expectedPrice: number; expectedDuration: number; expectedRulesVersion:number; name: string; email: string; phone?: string };
export type BookingResult = { id: string; reference: string; serviceName: string; staffName: string; start: string; end: string; price: number; duration: number; cancellationHours?:number|null; status: string };
