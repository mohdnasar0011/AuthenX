# **App Name**: CertiTrust

## Core Features:

- Certificate Upload & OCR Extraction: Allows users to upload certificates (PDF/images) and uses OCR to extract key fields like name, roll number, and certificate ID.
- DigiLocker Mock Verification: Compares the extracted data against records in a mock DigiLocker database (local JSON file) to check for matches.
- Image Tampering Detection Tool: Uses OpenCV and basic deep learning tool to detect potential visual tampering in the uploaded certificate image (e.g., missing seals, unnatural blurs). Returns a tampering score.
- Trust Score Calculation & Verdict: Calculates a final trust score based on OCR accuracy, DigiLocker match, tampering score and blockchain verification.  Displays a final verdict (Valid, Suspicious, or Forged).
- Verification Report Display: Presents the verification results in an interactive and user-friendly report.
- Verified Document Cross-Check and Blockchain Storage: Allows users to upload verified documents for cross-checking against unverified documents. Uses blockchain to mark and store verified documents.

## Style Guidelines:

- Primary color: A professional and trustworthy blue (#29ABE2) for main UI elements.
- Background color: A light, desaturated blue (#E0F7FA) to provide a clean and non-distracting backdrop.
- Accent color: A vibrant green (#90EE90) to indicate successful verifications and highlight important information.
- Body and headline font: 'Inter', a sans-serif font for a clean and modern user interface.
- Use clear, simple, and professional icons to represent verification steps and results.
- A clean and structured layout with clear sections for uploading certificates, displaying OCR results, presenting the trust score, and showing the final report.
- Subtle animations to provide feedback during the verification process (e.g., loading animations, progress indicators).