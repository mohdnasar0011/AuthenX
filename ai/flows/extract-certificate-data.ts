'use server';

/**
 * @fileOverview Flow to extract data from a certificate image and analyze for tampering.
 *
 * - extractCertificateData - Function to initiate the data extraction and tampering analysis.
 * - ExtractCertificateDataInput - Input type for the function.
 * - ExtractCertificateDataOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractCertificateDataInputSchema = z.object({
  certificateImageDataUri: z
    .string()
    .describe(
      "The certificate image data as a URI, which must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractCertificateDataInput = z.infer<typeof ExtractCertificateDataInputSchema>;

const ExtractCertificateDataOutputSchema = z.object({
    name: z.string().describe("The full name of the certificate holder."),
    rollNumber: z.string().describe("The roll number or student ID on the certificate."),
    certificateId: z.string().describe("The unique identifier for the certificate."),
    dateOfBirth: z.string().optional().describe("The certificate holder's date of birth (e.g., DD-MM-YYYY)."),
    fathersName: z.string().optional().describe("The father's name of the certificate holder."),
    mothersName: z.string().optional().describe("The mother's name of the certificate holder."),
    tamperingScore: z
    .number()
    .describe(
      'A score (0-1) indicating the likelihood of tampering, with 1 being highly likely.'
    ),
    tamperingExplanation: z.string().describe('Explanation of why the tampering score was given.'),
});
export type ExtractCertificateDataOutput = z.infer<typeof ExtractCertificateDataOutputSchema>;

export async function extractCertificateData(
  input: ExtractCertificateDataInput
): Promise<ExtractCertificateDataOutput> {
  return extractCertificateDataFlow(input);
}

const ocrAndTamperingPrompt = ai.definePrompt({
  name: 'ocrAndTamperingPrompt',
  input: {schema: ExtractCertificateDataInputSchema},
  output: {schema: ExtractCertificateDataOutputSchema},
  prompt: `You are an expert OCR (Optical Character Recognition) engine and a forensic document analyst. Your task is to perform two actions on the provided certificate image:
    
    1.  **Extract Data**: Extract the following fields using OCR: name, rollNumber, certificateId, and if available, dateOfBirth, fathersName, and mothersName.
        - Pay close attention to labels. 'rollNumber' can be "Roll No." or "Admit Card ID". 'certificateId' can be "Certificate No." or "Serial No.".
        - Do not confuse the rollNumber and certificateId. Only return fields present in the document.

    2.  **Analyze for Tampering**: Analyze the image for any signs of tampering.
        - Consider visual cues like missing seals, unnatural blurs, inconsistent fonts, or other anomalies.
        - Important: DigiLocker documents may have a digital signature date much later than the issue date. This is normal and should NOT be considered tampering. Focus on other visual cues.
        - Provide a tamperingScore (0-1, where 1 is high likelihood of tampering) and a tamperingExplanation.

    Certificate Image: {{media url=certificateImageDataUri}}
    `,
});

const extractCertificateDataFlow = ai.defineFlow(
  {
    name: 'extractCertificateDataFlow',
    inputSchema: ExtractCertificateDataInputSchema,
    outputSchema: ExtractCertificateDataOutputSchema,
  },
  async input => {
    const {output} = await ocrAndTamperingPrompt(input);
    return output!;
  }
);
