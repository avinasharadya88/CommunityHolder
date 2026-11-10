const BASE_URL = '/api/v1';

export interface UserSession {
  id: string;
  phone_e164: string;
  full_name: string;
  kyc_status: 'UNREGISTERED' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  roles: string[];
  active_society_id?: string;
  unit_id?: string;
  rejection_reason?: string;
}

class ApiClient {
  private token: string | null = null;
  private currentUser: UserSession | null = null;

  constructor() {
    this.token = localStorage.getItem('ch_token');
    const stored = localStorage.getItem('ch_user');
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch (e) {
        // ignore
      }
    }
  }

  setSession(token: string, user: UserSession) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem('ch_token', token);
    localStorage.setItem('ch_user', JSON.stringify(user));
  }

  clearSession() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('ch_token');
    localStorage.removeItem('ch_user');
  }

  getToken() {
    return this.token;
  }

  getUser() {
    return this.currentUser;
  }

  // Society / Apartment Selection
  async getSocieties(): Promise<any[]> {
    return this.request('/societies');
  }

  getSelectedSocietyId(): string {
    return localStorage.getItem('ch_selected_society_id') || 'soc_prestige_greenwoods';
  }

  getSelectedSocietyName(): string {
    return localStorage.getItem('ch_selected_society_name') || 'Generic Apartment name';
  }

  setSelectedSociety(id: string, name: string) {
    localStorage.setItem('ch_selected_society_id', id);
    localStorage.setItem('ch_selected_society_name', name);
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || `HTTP ${res.status}`);
      }
      return data;
    } catch (err: any) {
      console.warn(`API call ${endpoint} failed:`, err.message);
      throw err;
    }
  }

  // 1. Auth
  async requestOtp(phone_e164: string) {
    return this.request('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_e164 }),
    });
  }

  async verifyOtp(phone_e164: string, otp: string, society_id?: string) {
    const data = await this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_e164, otp, society_id }),
    });
    if (data.access_token && data.user) {
      this.setSession(data.access_token, data.user);
    }
    return data;
  }

  // 2. KYC
  async getKycStatus() {
    return this.request('/onboarding/kyc/status');
  }

  async submitKyc(payload: any) {
    return this.request('/onboarding/kyc/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAdminKycQueue() {
    return this.request('/admin/kyc/queue');
  }

  async reviewKycDecision(applicationId: string, decision: 'APPROVE' | 'REJECT', notes?: string, rejection_reason?: string) {
    return this.request(`/admin/kyc/${applicationId}/decision`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, notes, rejection_reason }),
    });
  }

  // 3. Gatekeeper
  async createVisitorPass(payload: any) {
    return this.request('/gate/visitor-sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async decideVisitor(sessionId: string, decision: 'APPROVE' | 'DENY' | 'LEAVE_AT_GATE') {
    return this.request(`/gate/visitor-sessions/${sessionId}/decision`, {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    });
  }

  async validatePin(passcode: string) {
    return this.request('/gate/validate-pin', {
      method: 'POST',
      body: JSON.stringify({ passcode }),
    });
  }

  async getActiveVisitors() {
    return this.request('/gate/active-visitors');
  }

  async logParcel(payload: any) {
    return this.request('/gate/parcels', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async collectParcel(parcelId: string, pickupOtp: string) {
    return this.request('/gate/parcels/collect', {
      method: 'POST',
      body: JSON.stringify({ parcel_id: parcelId, pickup_otp: pickupOtp }),
    });
  }

  // 4. ERP
  async getUnitInvoices(unitId: string) {
    return this.request(`/erp/invoices/unit/${unitId}`);
  }

  async settlePayment(invoiceId: string, amount: number) {
    return this.request('/payments/settle', {
      method: 'POST',
      body: JSON.stringify({ invoice_id: invoiceId, amount, payment_method: 'CRED_UPI' }),
    });
  }

  async getLedgerReport() {
    return this.request('/erp/reports/ledger');
  }

  async generateMonthlyBilling(rate: number, society_id: string = 'soc_prestige_greenwoods') {
    return this.request('/erp/invoices/generate-monthly', {
      method: 'POST',
      body: JSON.stringify({ society_id, rate_per_sqft: rate }),
    });
  }

  async simulateVanTransfer(amount: number) {
    return this.request('/webhooks/banking/van', {
      method: 'POST',
      body: JSON.stringify({
        virtual_account_number: 'CHOLDRBLR1204',
        amount,
        utr_reference: `CMS${Date.now()}`,
      }),
    });
  }

  // 5. NFR DPDPA Purge
  async triggerDpdpaPurge() {
    return this.request('/admin/maintenance/purge-old-visitor-photos', {
      method: 'POST',
    });
  }
}

export const api = new ApiClient();

