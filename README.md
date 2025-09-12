# AuthenX: Decentralized Certificate Verification

AuthenX is a modern, full-stack application designed to verify the authenticity of digital certificates using a multi-layered trust system. It leverages AI for Optical Character Recognition (OCR) and tampering analysis, compares data against institutional records, and utilizes a blockchain-like immutable ledger for ultimate security.

https://github.com/user-attachments/assets/1959556c-20f4-4a25-a131-0dfd8787c88a

## ✨ Key Features

*   **AI-Powered OCR:** Intelligently extracts key information (name, roll number, etc.) from uploaded certificate images or PDFs.
*   **Tampering Detection:** An AI-driven forensic analysis provides a score and explanation for potential digital alterations.
*   **Deterministic Shell ID:** Generates a unique, consistent hash (a "Shell ID") from certificate data for tamper-proof verification.
*   **Multi-Source Verification:** Cross-references extracted data against both a simulated "DigiLocker" database and a persistent "Blockchain" ledger.
*   **Persistent Storage:** Uses **Vercel KV** as a durable, serverless database to store institutional records, ensuring data is never lost on redeployment.
*   **Trust Score Algorithm:** Calculates a dynamic Trust Score based on OCR accuracy, data source matches, and tampering analysis.
*   **Role-Based Access:** Separate interfaces for standard users (verification) and admins (record management).
*   **Institutional API:** A secure REST API endpoint for institutions to programmatically add new certificates to the blockchain.

## 🚀 Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **AI/Generative:** [Google Gemini & Genkit](https://firebase.google.com/docs/genkit)
*   **Database:** [Vercel KV](https://vercel.com/storage/kv)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **UI Components:** [Shadcn/ui](https://ui.shadcn.com/)
*   **Deployment:** [Vercel](https://vercel.com/)

## 🏁 Getting Started & Deployment

This project is configured for a seamless deployment on Vercel.

### 1. Set Up Your Repository

Push the project code to a new repository on your GitHub, GitLab, or Bitbucket account.

### 2. Configure Your Vercel Project

1.  **Import Project:** On your Vercel dashboard, click "Add New... > Project" and import the repository you just created.
2.  **Create KV Database:**
    *   Navigate to the "Storage" tab in your new Vercel project.
    *   Click "Create Database" and choose "KV (Redis)".
    *   Follow the prompts to create and **connect** the database to your project.
3.  **Set Environment Variables:**
    *   Navigate to the "Settings" tab and then "Environment Variables".
    *   Add the following two secrets. These are required for the AI and the institutional API to function.
      *   `GEMINI_API_KEY`: Your API key for Google AI Studio.
      *   `INSTITUTION_API_KEY`: A secret key of your choice (e.g., a secure random string) that you will use to authenticate with the API endpoint.

### 4. Deploy

Trigger a new deployment from the "Deployments" tab. Vercel will automatically build the application and deploy it. The first time the application runs, it will automatically "seed" the Vercel KV database with the initial records from `data/blockchain.json` and `data/digilocker.json`.

##  Institutional API

The application includes a secure API endpoint for institutions to add new certificate records directly to the blockchain ledger.

*   **Endpoint:** `POST /api/add-record`
*   **Authentication:** Requires an `x-api-key` header matching the `INSTITUTION_API_KEY` you set in your environment variables.
*   **Body:** A JSON object matching the certificate record format.

**Example Request (using cURL):**

```bash
curl -X POST https://<your-deployment-url>.vercel.app/api/add-record \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secret-api-key" \
  -d '{
        "name": "Jane Doe",
        "rollNumber": "987654",
        "certificateId": "CERT-2024-002",
        "dateOfBirth": "15-08-2004",
        "fathersName": "John Doe",
        "mothersName": "Janet Doe"
      }'
```

## 📜 License

Copyright (c) 2024 AuthenX. All Rights Reserved. See the [LICENSE](LICENSE) file for details.
