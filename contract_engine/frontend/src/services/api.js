import axios from "axios";

// Use relative URLs so Vite's proxy forwards to the FastAPI backend during dev.
// In production, set VITE_API_BASE to the deployed backend URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "",
  headers: { "Content-Type": "application/json" },
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// CONTRACT SERVICES
export async function uploadContract(file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/upload-contract", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function extractSLA(documentId) {
  const { data } = await api.post(`/extract-sla/${documentId}`);
  return data;
}

export async function analyzeContract(documentId) {
  const { data } = await api.post(`/analyze-contract/${documentId}`);
  return data;
}

export async function getContractDetails(documentId) {
  const { data } = await api.get(`/contracts/${documentId}`);
  return data;
}

export async function getUserContracts() {
  const { data } = await api.get("/contracts");
  return data;
}

export async function deleteContract(documentId) {
  const { data } = await api.delete(`/contracts/${documentId}`);
  return data;
}

// VEHICLE SERVICES
export async function lookupVIN(vin) {
  const cleanedVin = String(vin || "").trim().toUpperCase();
  const { data } = await api.get(`/vehicle-details/${encodeURIComponent(cleanedVin)}`);
  return data;
}

export async function getVehicleByContract(documentId) {
  const { data } = await api.get(`/vehicle/${documentId}`);
  return data;
}

// ANALYSIS SERVICES
export async function getAnalysis(documentId) {
  const slaResult = await extractSLA(documentId);

  let analysisResult = null;
  try {
    analysisResult = await analyzeContract(documentId);
  } catch (error) {
    const statusCode = error?.response?.status;
    // Missing VIN or market data should not block showing extracted SLA.
    if (statusCode !== 400 && statusCode !== 404) {
      throw error;
    }
  }

  return {
    sla: slaResult?.sla_data || null,
    analysis: analysisResult,
  };
}

export async function compareContracts(contractIds) {
  const { data } = await api.post("/compare", {
    contract_ids: contractIds,
  });
  return data;
}

export async function generateRiskReport(documentId) {
  const { data } = await api.get(`/risk-report/${documentId}`);
  return data;
}

// CHAT SERVICES
export async function chatWithAssistant(message, documentId) {
  const { data } = await api.post("/negotiation-assistant", {
    message,
    document_id: documentId,
  });
  return data;
}

export async function getChatHistory(documentId) {
  const { data } = await api.get(`/chat-history/${documentId}`);
  return data;
}

// REPORT SERVICES
export async function generatePDFReport(documentId) {
  const { data } = await api.get(`/report/pdf/${documentId}`, {
    responseType: "blob",
  });
  return data;
}

export async function generateCSVReport(documentId) {
  const { data } = await api.get(`/report/csv/${documentId}`, {
    responseType: "blob",
  });
  return data;
}

export async function getReportData(documentId) {
  const { data } = await api.get(`/report/${documentId}`);
  return data;
}

// AUTH SERVICES (if backend supports)
export async function signup(email, password, fullName) {
  const { data } = await api.post("/auth/signup", {
    email,
    password,
    full_name: fullName,
  });
  return data;
}

export async function login(email, password) {
  const { data } = await api.post("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function getCurrentUser() {
  const { data } = await api.get("/auth/me");
  return data;
}

export default api;
