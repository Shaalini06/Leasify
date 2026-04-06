# 🚗 Leasify  
AI-powered contract intelligence platform for analyzing car lease and loan agreements using OCR, LLM extraction, risk scoring, VIN decoding, market comparison, and interactive dashboards.

Contents  
Overview  
Features  
Architecture  
Tech Stack  
Project Structure  
Quick Start  
Configuration (.env)  
Running (Local)  
API Reference  
Authentication  
Contract Processing Flow  
Reporting  
Future Enhancements  
License  

Overview  
Leasify is an AI-powered platform that simplifies complex car lease and loan contracts.

The platform allows users to:

Upload contract documents (PDF/Image)  
Extract text using OCR  
Convert contracts into structured SLA data  
Analyze contracts using AI and rule-based scoring  
Detect risks and hidden costs  
Compare multiple contracts  
Generate PDF reports  
Chat with an AI negotiation assistant  

Leasify is built using React for frontend, FastAPI for backend, SQLite/PostgreSQL for database, OpenRouter for AI processing, and external APIs for vehicle and market data.

Features  
JWT-based authentication system  
Contract upload and OCR extraction  
AI-based SLA field extraction (APR, EMI, loan term, etc.)  
Hybrid risk scoring engine  
VIN decoding using NHTSA API  
Market price comparison using CarQuery  
Contract comparison feature  
AI negotiation assistant (chat)  
Interactive dashboard with charts  
PDF report generation  
REST API-based architecture  

Architecture  

Frontend:  
React  
Tailwind CSS  
Chart.js  
AuthContext for authentication state  
API service layer  

Backend:  
FastAPI  
SQLAlchemy ORM  
Pydantic schemas  
OCR service  
LLM extraction service  
Risk analysis engine  

Infrastructure:  
SQLite (development)  
PostgreSQL (production)  
OpenRouter (LLM + OCR Vision)  
NHTSA API (VIN decoding)  
CarQuery API (market data)  

Tech Stack  
Frontend: React, Tailwind CSS, Vite, Chart.js  
Backend: FastAPI, Python  
Database: SQLite, PostgreSQL  
Authentication: JWT  
AI/LLM: OpenRouter  
OCR: Vision-based OCR  
APIs: NHTSA, CarQuery  
Reports: PDF generation  

Project Structure  

frontend/  
├── src/  
│   ├── components/  
│   ├── pages/  
│   ├── context/  
│   ├── services/  
│   └── styles/  

backend/  
├── main.py  
├── database.py  
├── models.py  
├── schemas.py  
├── routers/  
├── services/  
├── requirements.txt  

Quick Start  

Prerequisites  
Python 3.10+  
Node.js 18+  
SQLite / PostgreSQL  
OpenRouter API Key  

Configuration (.env)  

DATABASE_URL=  
OPENROUTER_API_KEY=  
CORS_ORIGINS=  
SECRET_KEY=  

Running (Local)  

Backend:  

cd contract_engine  
pip install -r requirements.txt  
uvicorn main:app --reload  

Frontend:  

cd contract_engine/frontend  
npm install  
npm run dev  

API Reference  

Authentication  

POST /api/auth/signup  
POST /api/auth/login  
GET /api/auth/me  

Contracts  

POST /api/upload-contract  
POST /api/extract-sla/{document_id}  
POST /api/analyze-contract/{document_id}  
GET /api/contracts  
DELETE /api/contracts/{document_id}  
POST /api/compare  

AI & Vehicle  

POST /api/negotiation-assistant  
GET /api/vehicle-details/{vin}  

Reports  

GET /api/report/{document_id}  
GET /api/report/pdf/{document_id}  

Authentication  
Leasify uses JWT authentication for secure login.

Roles:  
User  

Protected routes require:  

Authorization: Bearer <token>  

Contract Processing Flow  

User uploads contract file  
Backend extracts text (OCR / embedded text)  
LLM extracts SLA structured data  
Risk scoring engine evaluates contract  
VIN decoding retrieves vehicle details  
Market comparison fetches price benchmarks  
Analysis report is generated  
Results stored in database  
Dashboard displays insights and charts  

Reporting  

Supported formats:  
PDF  

Report contents:  
SLA extracted data  
Risk score  
Market comparison  
Recommendations  
Summary insights  

Future Enhancements  

Multi-user contract isolation  
Chat history storage  
Advanced AI scoring models  
CSV/Excel export  
Improved security and encryption  
Real-time analytics dashboard  

License  

MIT License  
