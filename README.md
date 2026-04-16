# VoltTrade: Atomic Distributed Energy Exchange ⚡

VoltTrade is a high-performance **Microservices-based Energy Trading Platform** designed
to solve the problem of data consistency in decentralized grids.
It utilizes a **Two-Phase Commit (2PC) Protocol** 
to ensure that energy-for-money swaps are atomic, consistent, and fully auditable.

##  Key Engineering Features

* **Distributed Atomicity (2PC):** Implements a Coordinator-Worker architecture to manage multi-service transactions. If the Wallet or Energy service fails, the system automatically triggers a **Global Rollback**.
* **Inter-Process Communication (IPC):** Uses low-level **Unix Sockets/Named Pipes** for ultra-fast, local communication between the Coordinator and Microservices, bypassing traditional HTTP overhead.
* **Immutable Audit Ledger:** Every finalized transaction is appended to a local ledger which is automatically version-controlled via a **hidden Git-repository**, providing a cryptographic forensic trail.
* **Real-time Protocol Monitoring:** An industrial-grade terminal UI that streams live protocol handshakes (`PREPARE`, `VOTE`, `COMMIT/ABORT`).
* **Payment Gateway Integration:** Secure transaction processing via **Razorpay API** for real-world currency-to-energy conversion.


##  System Architecture

The system is divided into four primary modules:
1.  coordinator Service:  The brain of the system. Orchestrates the 2PC handshake and manages the IPC pipes.
2.  Wallet Service (Node.js/MongoDB):  Manages user balances and handles the 'Lock' phase of the transaction.
3.  Energy Service (Node.js/MongoDB):  Manages energy credits and smart-meter data.
4.  Audit Ledger:  A persistent, Git-versioned file system for forensic transaction tracking.

## 🛠️ Tech Stack

- Frontend: React.js (Tailwind CSS, Lucide Icons)
- Backend: Node.js, Express.js
- Database: MongoDB (NoSQL)
- Communication:Unix Sockets (IPC), REST
- Version Control: Git (used as a Ledger Database)

## 📋 Role Distribution

* **Rishika Raghuvanshi (System Protocol Engineer):** Architected the core **Two-Phase Commit (2PC)** state machine, logic for **Global Rollbacks**, and the low-level **IPC Handshake** protocol.
* **Rohan Singh (Data Persistence Lead):** Designed the multi-service **MongoDB schemas** and implemented the **State-Locking** mechanisms to prevent double-spending during trades.
* **Rohit (Security & Auditing):** Developed the **Forensic Audit Ledger** using Git-versioning to ensure non-repudiation and transaction history integrity.
* **Rohit Sharma (Interface Integration Lead):** Engineered the **Industrial Terminal Dashboard** and integrated real-time protocol visualization for live backend monitoring.
* **Shivam Kumar Upadhyay (Reliability & Middleware Dev):** Oversaw **Fault Tolerance protocols**, automated error handling, and the **Razorpay API** financial integration.



## 🚦 Getting Started

1. Clone the repository.
2. Run `npm install` in each service directory.
3. Configure your `.env` with MongoDB and Razorpay credentials.
4. Run the seed script: `node seed.js`.
5. Start services: `npm start`.

---
© 2026 VoltTrade Engineering Team
