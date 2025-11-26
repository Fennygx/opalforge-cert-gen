import { PDFDocument, rgb } from 'pdf-lib';
import { D1Database } from '@cloudflare/workers-types'; // Import D1Database type

// --- 1. Define the Environment Interface with D1 Binding ---
interface Env {
    CERT_DB: D1Database; // This binds the D1 database defined in wrangler.toml
}

// Remove the old hardcoded CERT_DATA object entirely.

async function createCertificatePDF(certId: string, env: Env) {
    
    // 1. Query the D1 database for the certificate ID
    const { results } = await env.CERT_DB.prepare("SELECT * FROM Certificates WHERE id = ?")
        .bind(certId)
        .all();

    const data = results[0];

    if (!data) {
        // This is the error message the Worker returned previously
        throw new Error("Certificate ID not found.");
    }
    
    // 2. Parse the metadata field (which is stored as JSON text)
    const metadata = JSON.parse(data.metadata as string); 
    
    // 3. Combine the main row data and the parsed metadata for the PDF generation
    // We use 'certDetails' to reference all data fields easily.
    const certDetails = {
        ...data, // includes id, email, revoked, template_name, etc.
        ...metadata // includes recipient_name, course_name, completion_date
    };

    const pdfDoc = await PDFDocument.create();
    // Assuming a standard page size for now
    const page = pdfDoc.addPage([600, 400]); 
    const { width, height } = page.getSize();

    // Load a font (using Helvetica is easiest as it's built-in)
    // NOTE: This is where we anticipate the first real runtime error.
    const helveticaBold = await pdfDoc.embedFont('Helvetica-Bold');
    const helvetica = await pdfDoc.embedFont('Helvetica');

    // --- PDF Content Drawing ---
    
    // Use certDetails for dynamic data access
    
    // 1. Title/Header
    page.drawText('OPALFORGE AI AUTHENTICATION CERTIFICATE', {
        x: 50,
        y: height - 50,
        size: 20,
        font: helveticaBold,
        color: rgb(0, 0.776, 1), // Light Blue
    });
    
    // 2. Certificate ID
    page.drawText(`VERIFICATION ID: ${certDetails.id}`, { // Using certDetails.id
        x: 50,
        y: height - 80,
        size: 14,
        font: helveticaBold,
        color: rgb(1, 1, 1), // White
    });

    // 3. Item Details (Using data from the metadata JSON)
    let yPos = height - 140;
    page.drawText('ITEM DETAILS', { x: 50, y: yPos, size: 16, font: helveticaBold, color: rgb(0.8, 0.8, 0.8) });
    yPos -= 25;
    page.drawText(`Recipient: ${certDetails.recipient_name}`, { x: 50, y: yPos, size: 12, font: helvetica, color: rgb(0.9, 0.9, 0.9) });
    yPos -= 20;
    page.drawText(`Course: ${certDetails.course_name}`, { x: 50, y: yPos, size: 12, font: helvetica, color: rgb(0.9, 0.9, 0.9) });
    yPos -= 20;
    page.drawText(`Completion Date: ${certDetails.completion_date}`, { x: 50, y: yPos, size: 12, font: helvetica, color: rgb(0.9, 0.9, 0.9) });

    // 4. Status/Authentication
    yPos = height - 140;
    page.drawText('CERTIFICATE STATUS', { x: 350, y: yPos, size: 16, font: helveticaBold, color: rgb(0, 0.776, 1) });
    yPos -= 40;
    // Check 'revoked' status (0 is valid, 1 is revoked)
    const statusText = certDetails.revoked === 1 ? 'REVOKED' : 'VALID';
    const statusColor = certDetails.revoked === 1 ? rgb(1, 0, 0) : rgb(0, 1, 0); 
    page.drawText(statusText, { x: 350, y: yPos, size: 30, font: helveticaBold, color: statusColor }); 
    yPos -= 30;
    page.drawText(`Issue Date: ${certDetails.created_at}`, { x: 350, y: yPos, size: 10, font: helvetica, color: rgb(0.7, 0.7, 0.7) });
    
    // 5. Footer
    page.drawText('FORGE UNBREAKABLE PROOF. OWN THE ETERNAL.', {
        x: 50,
        y: 40,
        size: 10,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
    });

    // 6. Serialize and return the PDF bytes
    return pdfDoc.save();
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ status: 'OK', message: 'Worker is running. Send POST request with certificate_id.' }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        try {
            const json = await request.json() as { certificate_id?: string };
            const certId = json.certificate_id;

            if (!certId) {
                return new Response(JSON.stringify({ status: 'ERROR', message: 'Missing certificate_id in request body.' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Pass the environment object (env) to the function
            const pdfBytes = await createCertificatePDF(certId, env);

            // Return the PDF to the browser/frontend
            return new Response(pdfBytes, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="OpalForge_Cert_${certId}.pdf"`,
                    'Access-Control-Allow-Origin': '*' // Essential for cross-domain requests from Pages site
                }
            });

        } catch (error) {
            console.error(error);
            return new Response(JSON.stringify({ status: 'ERROR', message: (error as Error).message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    },
};
