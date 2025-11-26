// No longer need pdf-lib, but need D1 and ArrayBuffer for the binary PDF response
import { D1Database } from '@cloudflare/workers-types'; 

// --- 1. Define the Environment Interface with D1 and API Key Bindings ---
interface Env {
    CERT_DB: D1Database;
    PDF_API_KEY: string; // This key must be added to wrangler.toml or Worker Secrets
}

// --- 2. HTML Template Function (This is where your CSS/HTML lives) ---
// This function contains the certificate design you provided and injects dynamic data.
function generateCertificateHTML(certDetails: any): string {
    // IMPORTANT: You will need to take the provided HTML/CSS and map the variables.
    // This is a simplified example showing how to inject the dynamic data.
    
    // For simplicity, we are placing the CSS inline in the HTML string, which the API needs.
    const cssStyles = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background-color: #000; color: #e0e0e0; font-family: 'Courier New', Courier, monospace; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 20px 0; }
        .certificate-container { position: relative; width: 90%; max-width: 600px; border: 2px solid #00ffff; padding: 2rem; background: #0a0a0a; box-shadow: 0 0 30px rgba(0, 255, 255, 0.1); margin-bottom: 20px; }
        .header { text-align: center; border-bottom: 1px solid #00ffff; padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
        .logo { width: 100px; height: auto; margin-bottom: 1rem; filter: drop-shadow(0 0 15px rgba(0, 255, 255, 0.7)); }
        h1 { font-size: 1.8rem; letter-spacing: 2px; color: #fff; margin-bottom: 0.5rem; }
        .sub-header { font-size: 0.8rem; color: #cccccc; letter-spacing: 1px; }
        .cert-id { margin-top: 1rem; font-size: 0.9rem; color: #0ff; text-shadow: 0 0 5px rgba(0, 255, 255, 0.4); }
        .item-details { margin-bottom: 2rem; }
        .item-details h3 { font-size: 1rem; border-left: 3px solid #0ff; padding-left: 10px; margin-bottom: 1rem; color: #fff; }
        .detail-line { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; color: #cccccc; border-bottom: 1px dashed #333; padding-bottom: 5px; }
        .detail-line span { color: #fff; font-weight: bold; text-align: right; }
        .auth-report { text-align: center; margin-bottom: 2rem; }
        .authenticity-badge { border: 1px solid #00ffff; box-shadow: inset 0 0 20px rgba(0, 255, 255, 0.05); padding: 1.5rem; position: relative; background: rgba(0, 255, 255, 0.02); }
        .confidence-score { font-size: 0.8rem; color: #cccccc; margin-bottom: 0.5rem; }
        .score-percent { font-size: 2.5rem; color: #0ff; font-weight: bold; text-shadow: 0 0 15px rgba(0, 255, 255, 0.3); }
        .date { margin-top: 0.5rem; font-size: 0.7rem; color: #aaaaaa; }
        .qr-section { text-align: center; margin-top: 2rem; }
        .qr-placeholder { width: 100px; height: 100px; margin: 0 auto; background-color: #fff; padding: 5px; }
        .trust-text { margin-top: 1rem; font-size: 0.7rem; color: #cccccc; text-transform: uppercase; letter-spacing: 1px; }
        .footer { text-align: center; margin-top: 2rem; font-size: 0.6rem; color: #aaaaaa; border-top: 1px solid #00ffff; padding-top: 1rem; }
    `;

    // Map your database fields to the HTML structure
    const statusText = certDetails.revoked === 1 ? 'REVOKED' : 'VALID';
    const scoreText = certDetails.score ? certDetails.score : 'N/A';
    const dateText = certDetails.created_at ? certDetails.created_at.split(' ')[0] : '--';

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>OpalForge Certificate ${certDetails.id}</title>
            <style>${cssStyles}</style>
        </head>
        <body>
            <div class="certificate-container">
                <div class="header">
                    <img src="https://example.com/OpalForge-Logo.png" alt="OpalForge Logo" class="logo">
                    <h1>OPALFORGE</h1>
                    <p class="sub-header">OFFICIAL AI AUTHENTICATION CERTIFICATE</p>
                    <p class="cert-id">CERTIFICATE ID: <span id="certificate-id-display">${certDetails.id}</span></p>
                </div>
                <div class="item-details">
                    <h3>ITEM DETAILS</h3>
                    <div class="detail-line">RECIPIENT NAME: <span>${certDetails.recipient_name}</span></div>
                    <div class="detail-line">COURSE NAME: <span>${certDetails.course_name}</span></div>
                    <div class="detail-line">COMPLETION DATE: <span>${certDetails.completion_date}</span></div>
                    <div class="detail-line">STATUS: <span>${statusText}</span></div>
                </div>
                <div class="auth-report">
                    <h3>AUTHENTICATION REPORT</h3>
                    <div class="authenticity-badge">
                        <p class="confidence-score">AI CONFIDENCE SCORE</p>
                        <p class="score-percent" id="score">${scoreText}</p>
                        <p class="date" id="date">AUTHENTICATION DATE: ${dateText}</p>
                    </div>
                </div>
                <div class="qr-section">
                    <img src="https://example.com/qr-code-placeholder.png" alt="Scan to Verify" class="qr-placeholder">
                    <p class="trust-text">FORGE UNBREAKABLE PROOF. OWN THE ETERNAL.</p>
                </div>
                <div class="footer">
                    <p>Powered by UNIVERSAL TRUST OS</p>
                </div>
            </div>
        </body>
        </html>
    `;
}


async function createCertificatePDF(certId: string, env: Env) {
    
    // 1. Query the D1 database for the certificate ID
    const { results } = await env.CERT_DB.prepare("SELECT * FROM Certificates WHERE id = ?")
        .bind(certId)
        .all();

    const data = results[0];

    if (!data) {
        throw new Error("Certificate ID not found.");
    }
    
    // 2. Parse the metadata field and combine data
    const metadata = JSON.parse(data.metadata as string); 
    const certDetails = {
        ...data, 
        ...metadata,
        // Optional: Add a placeholder score if not in metadata
        score: metadata.score || '99.9%' 
    };

    // --- 3. Dynamically generate the HTML using the function ---
    const htmlContent = generateCertificateHTML(certDetails);
    
    // --- 4. Send HTML to the PDF Generation API ---
    const pdfApiUrl = 'https://api.pdfservice.io/v1/generate'; // Replace with your chosen API endpoint
    
    const response = await fetch(pdfApiUrl, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${env.PDF_API_KEY}`, 
            'Content-Type': 'application/json',
            'Accept': 'application/pdf'
        },
        body: JSON.stringify({
            html: htmlContent,
            options: {
                format: 'A4',
                printBackground: true,
                // Add any other necessary API options (e.g., margins, scaling)
            }
        })
    });

    if (!response.ok) {
        // Log the failure details if the API request itself fails
        console.error(`PDF API failed with status ${response.status}: ${await response.text()}`);
        throw new Error(`PDF generation failed. Status: ${response.status}`);
    }

    // 5. Return the PDF bytes from the API
    return response.arrayBuffer(); 
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

            const pdfBytes = await createCertificatePDF(certId, env);

            // Return the PDF to the browser/frontend
            return new Response(pdfBytes, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="OpalForge_Cert_${certId}.pdf"`,
                    'Access-Control-Allow-Origin': '*' 
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
