import { PDFDocument, rgb } from 'pdf-lib';

// Placeholder data storage (replace with KV or D1 lookup later)
const CERT_DATA: Record<string, any> = {
    'OPAL-0001': {
        model: 'Air Jordan 1 Retro High OG',
        colorway: 'Chicago Lost & Found',
        size: 'US 10',
        score: '99.8%',
        date: new Date().toLocaleDateString('en-US')
    },
    'OPAL-0002': {
        model: 'Adidas Yeezy Boost 350',
        colorway: 'Turtle Dove',
        size: 'US 11',
        score: '98.5%',
        date: new Date().toLocaleDateString('en-US')
    }
};

interface Env {
    // You can bind your KV or D1 here if needed for real data lookup
}

async function createCertificatePDF(certId: string) {
    const data = CERT_DATA[certId];

    if (!data) {
        throw new Error("Certificate ID not found.");
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]); // Standard A4 ratio
    const { width, height } = page.getSize();

    // Load a font (using Helvetica is easiest as it's built-in)
    const helveticaBold = await pdfDoc.embedFont('Helvetica-Bold');
    const helvetica = await pdfDoc.embedFont('Helvetica');

    // --- PDF Content Drawing ---

    // 1. Title/Header
    page.drawText('OPALFORGE AI AUTHENTICATION CERTIFICATE', {
        x: 50,
        y: height - 50,
        size: 20,
        font: helveticaBold,
        color: rgb(0, 0.776, 1), // Light Blue
    });
    
    // 2. Certificate ID
    page.drawText(`VERIFICATION ID: ${certId}`, {
        x: 50,
        y: height - 80,
        size: 14,
        font: helveticaBold,
        color: rgb(1, 1, 1), // White
    });

    // 3. Item Details
    let yPos = height - 140;
    page.drawText('ITEM DETAILS', { x: 50, y: yPos, size: 16, font: helveticaBold, color: rgb(0.8, 0.8, 0.8) });
    yPos -= 25;
    page.drawText(`Model: ${data.model}`, { x: 50, y: yPos, size: 12, font: helvetica, color: rgb(0.9, 0.9, 0.9) });
    yPos -= 20;
    page.drawText(`Colorway: ${data.colorway}`, { x: 50, y: yPos, size: 12, font: helvetica, color: rgb(0.9, 0.9, 0.9) });
    yPos -= 20;
    page.drawText(`Size: ${data.size}`, { x: 50, y: yPos, size: 12, font: helvetica, color: rgb(0.9, 0.9, 0.9) });

    // 4. Score/Authentication
    yPos = height - 140;
    page.drawText('AUTHENTICATION SCORE', { x: 350, y: yPos, size: 16, font: helveticaBold, color: rgb(0, 0.776, 1) });
    yPos -= 40;
    page.drawText(`${data.score}`, { x: 350, y: yPos, size: 30, font: helveticaBold, color: rgb(0, 1, 0) }); // Bright Green for Score
    yPos -= 30;
    page.drawText(`Auth Date: ${data.date}`, { x: 350, y: yPos, size: 10, font: helvetica, color: rgb(0.7, 0.7, 0.7) });
    
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

            const pdfBytes = await createCertificatePDF(certId);

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
