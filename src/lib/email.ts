import { Resend } from "resend";

// Initialize Resend with key from environment variables
const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

// Default from email from environment or fallback
const FROM_EMAIL = "noreply@dynasity-voult.com";

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Helper: Common premium styling wrapper for emails with a prominent blue CTA button
const getEmailWrapper = (title: string, contentHtml: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f5f7;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border: 1px solid #e4e7eb;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #1a1a1a;
      padding: 32px;
      text-align: center;
      border-bottom: 2px solid #2563eb; /* Royal blue accent line */
    }
    .logo {
      font-family: Georgia, serif;
      font-size: 24px;
      font-weight: bold;
      color: #ffffff;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin: 0;
    }
    .subtitle {
      font-size: 10px;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      margin-top: 4px;
      margin-bottom: 0;
    }
    .content {
      padding: 40px 32px;
      line-height: 1.6;
    }
    .card {
      background-color: #fafbfb;
      border: 1px solid #e4e7eb;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
    }
    .button-container {
      text-align: center;
      margin-top: 32px;
      margin-bottom: 16px;
    }
    .button {
      display: inline-block;
      background-color: #2563eb; /* Royal blue, prominent button */
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 12px 32px;
      border-radius: 6px;
      letter-spacing: 0.05em;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
    }
    .footer {
      background-color: #fafbfb;
      border-top: 1px solid #e4e7eb;
      padding: 24px 32px;
      text-align: center;
      font-size: 11px;
      color: #718096;
    }
    .blue-text {
      color: #2563eb;
      font-weight: bold;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
      color: #1a1a1a;
    }
    p {
      font-size: 14px;
      margin-top: 0;
      margin-bottom: 16px;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">Dynasity-Voult</div>
      <div class="subtitle">Premium Curation & Auction House</div>
    </div>
    <div class="content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">Dynasity-Voult Logistics Center &bull; High-Security Fine Art Escrow</p>
      <p style="margin: 0;">&copy; 2026 Dynasity-Voult. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

/**
 * FUNCTION 1: sendAuctionApplicationApprovedEmail
 * Parameters: sellerEmail, sellerName, artifactTitle, auctionStartTime, auctionUrl
 */
export async function sendAuctionApplicationApprovedEmail(
  sellerEmail: string,
  sellerName: string,
  artifactTitle: string,
  auctionStartTime: string,
  auctionUrl: string
): Promise<EmailResponse> {
  const title = "Auction Application Approved";
  const contentHtml = `
    <h1>Application Approved!</h1>
    <p>Dear ${sellerName},</p>
    <p>Your auction application for <span class="blue-text">"${artifactTitle}"</span> has been APPROVED! Your auction goes LIVE on ${new Date(auctionStartTime).toLocaleString()}.</p>
    
    <div class="card">
      <h3 style="margin-top: 0; margin-bottom: 12px; color: #1a1a1a; font-size: 14px;">Details:</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568; width: 120px;">Artifact:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${artifactTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Go-Live Time:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${new Date(auctionStartTime).toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <p>Click the button below to view your scheduled live auction details:</p>
    
    <div class="button-container">
      <a href="${auctionUrl}" class="button">View Live Auction</a>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: sellerEmail,
      subject: `Approved: Curation Request for "${artifactTitle}"`,
      html: getEmailWrapper(title, contentHtml),
    });

    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    console.error("❌ Error in sendAuctionApplicationApprovedEmail:", error);
    return { success: false, error: error.message || "Failed to send approval email." };
  }
}

/**
 * FUNCTION 2: sendAuctionApplicationRejectedEmail
 * Parameters: sellerEmail, sellerName, artifactTitle, rejectionReason
 */
export async function sendAuctionApplicationRejectedEmail(
  sellerEmail: string,
  sellerName: string,
  artifactTitle: string,
  rejectionReason: string
): Promise<EmailResponse> {
  const title = "Auction Application Status Update";
  const contentHtml = `
    <h1>Application Curation Update</h1>
    <p>Dear ${sellerName},</p>
    <p>Thank you for submitting your premium artifact <span class="blue-text">"${artifactTitle}"</span> to our curation board.</p>
    <p>Your auction application for <span class="blue-text">"${artifactTitle}"</span> has been REJECTED. Please review and resubmit with better documentation.</p>
    
    <div class="card" style="border-left: 4px solid #ef4444; background-color: #fef2f2;">
      <h3 style="margin-top: 0; margin-bottom: 8px; color: #991b1b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Rejection Reason:</h3>
      <p style="margin: 0; font-style: italic; color: #1f2937; font-size: 13px;">"${rejectionReason || "No explanation provided."}"</p>
    </div>

    <p>You can check the dashboard details, update ownership records, or provenance logs and resubmit for curation audit at any time.</p>
    
    <div class="button-container">
      <a href="https://dynasity-voult.com/seller/apply-for-auction" class="button">Open Dashboard</a>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: sellerEmail,
      subject: `Update: Curation Request for "${artifactTitle}"`,
      html: getEmailWrapper(title, contentHtml),
    });

    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    console.error("❌ Error in sendAuctionApplicationRejectedEmail:", error);
    return { success: false, error: error.message || "Failed to send rejection email." };
  }
}

/**
 * FUNCTION 3: sendBidPlacedNotificationEmail
 * Parameters: bidderEmail, bidderName, artifactTitle, bidAmount, auctionUrl
 */
export async function sendBidPlacedNotificationEmail(
  bidderEmail: string,
  bidderName: string,
  artifactTitle: string,
  bidAmount: number,
  auctionUrl: string
): Promise<EmailResponse> {
  const title = "Bid Placed Successfully";
  const contentHtml = `
    <h1>Bid Placed!</h1>
    <p>Dear ${bidderName},</p>
    <p>Your bid of <span class="blue-text">$${bidAmount.toLocaleString()}</span> on <span class="blue-text">"${artifactTitle}"</span> has been placed successfully! You are now the highest bidder. Watch the auction details below.</p>
    
    <div class="card">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Item Name:</td>
          <td style="padding: 6px 0; color: #1a1a1a; text-align: right;">${artifactTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Your Bid Amount:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #2563eb; text-align: right;">$${bidAmount.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <p>Click the link below to watch the live bidding progress:</p>
    
    <div class="button-container">
      <a href="${auctionUrl}" class="button">Watch Auction Room</a>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: bidderEmail,
      subject: `Confirmed: Bid Placed on "${artifactTitle}"`,
      html: getEmailWrapper(title, contentHtml),
    });

    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    console.error("❌ Error in sendBidPlacedNotificationEmail:", error);
    return { success: false, error: error.message || "Failed to send bid notification email." };
  }
}

/**
 * FUNCTION 4: sendOutbidNotificationEmail
 * Parameters: bidderEmail, bidderName, artifactTitle, newBidAmount, auctionUrl
 */
export async function sendOutbidNotificationEmail(
  bidderEmail: string,
  bidderName: string,
  artifactTitle: string,
  newBidAmount: number,
  auctionUrl: string
): Promise<EmailResponse> {
  const title = "You've Been Outbid";
  const contentHtml = `
    <h1>Outbid Notice</h1>
    <p>Dear ${bidderName},</p>
    <p>You've been outbid on <span class="blue-text">"${artifactTitle}"</span>! New highest bid: <span class="blue-text">$${newBidAmount.toLocaleString()}</span>. Place a higher bid to stay in the auction.</p>
    
    <div class="card" style="border-left: 4px solid #f59e0b; background-color: #fffbeb;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Asset:</td>
          <td style="padding: 6px 0; color: #1a1a1a; text-align: right;">${artifactTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">New Highest Bid:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #b45309; text-align: right;">$${newBidAmount.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <p>Don't lose this masterpiece! Increase your offer by clicking below:</p>
    
    <div class="button-container">
      <a href="${auctionUrl}" class="button">Place a Higher Bid</a>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: bidderEmail,
      subject: `Alert: You've been outbid on "${artifactTitle}"`,
      html: getEmailWrapper(title, contentHtml),
    });

    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    console.error("❌ Error in sendOutbidNotificationEmail:", error);
    return { success: false, error: error.message || "Failed to send outbid notification email." };
  }
}

/**
 * FUNCTION 5: sendAuctionWonEmail
 * Parameters: winnerEmail, winnerName, artifactTitle, finalBid, checkoutUrl
 */
export async function sendAuctionWonEmail(
  winnerEmail: string,
  winnerName: string,
  artifactTitle: string,
  finalBid: number,
  checkoutUrl: string
): Promise<EmailResponse> {
  const title = "Auction Won!";
  const contentHtml = `
    <h1 style="color: #2563eb;">Congratulations!</h1>
    <p>Dear ${winnerName},</p>
    <p>CONGRATULATIONS! You won <span class="blue-text">"${artifactTitle}"</span> with a final bid of <span class="blue-text">$${finalBid.toLocaleString()}</span>! Complete your purchase using the link below.</p>
    
    <div class="card" style="border: 2px solid #2563eb; background-color: #eff6ff;">
      <h3 style="margin-top: 0; color: #1e3a8a; font-size: 15px;">Winning Summary:</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #1e3a8a;">Masterpiece:</td>
          <td style="padding: 6px 0; color: #1d4ed8; font-weight: bold; text-align: right;">${artifactTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #1e3a8a;">Winning Offer:</td>
          <td style="padding: 6px 0; color: #2563eb; font-weight: bold; text-align: right; font-size: 16px;">$${finalBid.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <p>Please click below to complete your checkout and arrange high-security shipping: </p>
    
    <div class="button-container">
      <a href="${checkoutUrl}" class="button">Complete Your Purchase</a>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: winnerEmail,
      subject: `Congratulations: You won "${artifactTitle}"!`,
      html: getEmailWrapper(title, contentHtml),
    });

    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    console.error("❌ Error in sendAuctionWonEmail:", error);
    return { success: false, error: error.message || "Failed to send auction won email." };
  }
}

/**
 * FUNCTION 6: sendAuctionLostEmail
 * Parameters: buyerEmail, buyerName, artifactTitle, winnerBid
 */
export async function sendAuctionLostEmail(
  buyerEmail: string,
  buyerName: string,
  artifactTitle: string,
  winnerBid: number
): Promise<EmailResponse> {
  const title = "Auction Completed";
  const contentHtml = `
    <h1>Auction Ended</h1>
    <p>Dear ${buyerName},</p>
    <p>The auction for <span class="blue-text">"${artifactTitle}"</span> has ended. Final winning bid: <span class="blue-text">$${winnerBid.toLocaleString()}</span>. Better luck next time!</p>
    
    <div class="card">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Artifact Title:</td>
          <td style="padding: 6px 0; color: #1a1a1a; text-align: right;">${artifactTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Winning Bid:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #1a1a1a; text-align: right;">$${winnerBid.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <p>Thank you for participating in the bidding rooms of Dynasity-Voult. Check out our upcoming auctions collection to acquire your next fine asset.</p>
    
    <div class="button-container">
      <a href="https://dynasity-voult.com/auctions" class="button">Explore Collection</a>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: buyerEmail,
      subject: `Ended: Curation Auction for "${artifactTitle}"`,
      html: getEmailWrapper(title, contentHtml),
    });

    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    console.error("❌ Error in sendAuctionLostEmail:", error);
    return { success: false, error: error.message || "Failed to send auction lost email." };
  }
}

/**
 * FUNCTION 7: sendOrderConfirmedEmail
 * Parameters: buyerEmail, buyerName, artifactTitle, amount, orderId, orderUrl
 */
export async function sendOrderConfirmedEmail(
  buyerEmail: string,
  buyerName: string,
  artifactTitle: string,
  amount: number,
  orderId: string,
  orderUrl: string
): Promise<EmailResponse> {
  const title = "Order Confirmation";
  const contentHtml = `
    <h1>Order Confirmed!</h1>
    <p>Dear ${buyerName},</p>
    <p>Your order for <span class="blue-text">"${artifactTitle}"</span> worth <span class="blue-text">$${amount.toLocaleString()}</span> has been confirmed! Order ID: <span style="font-family: monospace; font-weight: bold;">${orderId}</span>.</p>
    
    <div class="card">
      <h3 style="margin-top: 0; color: #1a1a1a; font-size: 14px;">Summary:</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Order Number:</td>
          <td style="padding: 6px 0; font-family: monospace; color: #1a1a1a; text-align: right;">#${orderId.slice(0, 8)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Acquisition:</td>
          <td style="padding: 6px 0; color: #1a1a1a; text-align: right;">${artifactTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Amount Charged:</td>
          <td style="padding: 6px 0; font-weight: bold; color: #1a1a1a; text-align: right;">$${amount.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <p>We are verifying shipping logistics routes and will email you tracking updates as soon as they are registered.</p>
    
    <div class="button-container">
      <a href="${orderUrl}" class="button">Track Your Order</a>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: buyerEmail,
      subject: `Receipt: Order Confirmation #${orderId.slice(0, 8)}`,
      html: getEmailWrapper(title, contentHtml),
    });

    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    console.error("❌ Error in sendOrderConfirmedEmail:", error);
    return { success: false, error: error.message || "Failed to send order confirmed email." };
  }
}

/**
 * FUNCTION 8: sendOrderShippedEmail
 * Parameters: buyerEmail, buyerName, artifactTitle, trackingNumber, trackingUrl
 */
export async function sendOrderShippedEmail(
  buyerEmail: string,
  buyerName: string,
  artifactTitle: string,
  trackingNumber: string,
  trackingUrl: string
): Promise<EmailResponse> {
  const title = "Your Masterpiece has Shipped";
  const contentHtml = `
    <h1>Order Shipped!</h1>
    <p>Dear ${buyerName},</p>
    <p>Your order for <span class="blue-text">"${artifactTitle}"</span> has been shipped! Tracking Number: <span style="font-family: monospace; font-weight: bold;">${trackingNumber || "N/A"}</span>.</p>
    
    <div class="card">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568; width: 120px;">Asset Name:</td>
          <td style="padding: 6px 0; color: #1a1a1a;">${artifactTitle}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #4a5568;">Tracking ID:</td>
          <td style="padding: 6px 0; font-family: monospace; color: #2563eb; font-weight: bold;">${trackingNumber || "N/A"}</td>
        </tr>
      </table>
    </div>

    <p>Our secure transport handlers are en route. Click the link below to track your package transit:</p>
    
    <div class="button-container">
      <a href="${trackingUrl}" class="button">Track Your Package</a>
    </div>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: buyerEmail,
      subject: `Shipped: Tracking Details for "${artifactTitle}"`,
      html: getEmailWrapper(title, contentHtml),
    });

    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    console.error("❌ Error in sendOrderShippedEmail:", error);
    return { success: false, error: error.message || "Failed to send shipping notification email." };
  }
}

/**
 * FUNCTION 9: sendAuctionStartingEmail
 */
export async function sendAuctionStartingEmail(
  email: string,
  userName: string,
  artifactTitle: string,
  startTime: string,
  auctionUrl: string
): Promise<EmailResponse> {
  const title = "Auction Starting Soon";
  const contentHtml = `
    <h1>Auction Starting Soon!</h1>
    <p>Dear ${userName},</p>
    <p>The auction showcase for <span class="blue-text">"${artifactTitle}"</span> goes live on ${new Date(startTime).toLocaleString()}. Get ready to place your offers!</p>
    <div class="button-container">
      <a href="${auctionUrl}" class="button">Go to Auction Room</a>
    </div>
  `;
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Alert: Auction Starting for "${artifactTitle}"`,
      html: getEmailWrapper(title, contentHtml),
    });
    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * FUNCTION 10: sendAuctionEndingEmail
 */
export async function sendAuctionEndingEmail(
  email: string,
  userName: string,
  artifactTitle: string,
  endTime: string,
  auctionUrl: string
): Promise<EmailResponse> {
  const title = "Auction Ending Soon";
  const contentHtml = `
    <h1>Auction Ending Soon!</h1>
    <p>Dear ${userName},</p>
    <p>The auction for <span class="blue-text">"${artifactTitle}"</span> is ending soon (scheduled end: ${new Date(endTime).toLocaleString()}). Place your bid now to avoid missing this piece!</p>
    <div class="button-container">
      <a href="${auctionUrl}" class="button">Place Bid Now</a>
    </div>
  `;
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Hurry: Auction ending for "${artifactTitle}"`,
      html: getEmailWrapper(title, contentHtml),
    });
    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * FUNCTION 11: sendSettlementEmail
 */
export async function sendSettlementEmail(
  sellerEmail: string,
  sellerName: string,
  amount: number,
  periodStart: string,
  periodEnd: string,
  stripeTransferId: string | null
): Promise<EmailResponse> {
  const title = "Payout Processed successfully";
  const contentHtml = `
    <h1>Payout Processed!</h1>
    <p>Dear ${sellerName},</p>
    <p>Your settlement payout of <span class="blue-text">$${amount.toLocaleString()} USD</span> for the period ${periodStart} to ${periodEnd} has been processed successfully.</p>
    <p>Stripe Transfer ID: <span style="font-family: monospace; font-weight: bold;">${stripeTransferId || "manual_settlement"}</span>.</p>
  `;
  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: sellerEmail,
      subject: `Settlement Completed: $${amount.toLocaleString()} Payout`,
      html: getEmailWrapper(title, contentHtml),
    });
    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * FUNCTION 12: sendDocumentVerificationEmail
 */
export async function sendDocumentVerificationEmail(
  sellerEmail: string,
  sellerName: string,
  docTitle: string,
  isVerified: boolean,
  rejectionReason?: string
): Promise<EmailResponse> {
  const statusStr = isVerified ? "verified" : "rejected";
  const title = `Artifact Document ${isVerified ? "Verified" : "Rejected"}`;
  
  const contentHtml = isVerified 
    ? `
      <h1>Document Verification Approved</h1>
      <p>Dear ${sellerName},</p>
      <p>Your document "<strong>${docTitle}</strong>" has been successfully verified by our curation team.</p>
      <p>This authenticity record is now active on your public product detail showcase pages.</p>
    `
    : `
      <h1>Document Verification Rejected</h1>
      <p>Dear ${sellerName},</p>
      <p>We regret to inform you that your document "<strong>${docTitle}</strong>" has been rejected during curation review.</p>
      <p><strong>Reason for rejection:</strong></p>
      <blockquote style="background-color: #f3f4f6; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; font-style: italic;">
        ${rejectionReason || "No explanation provided."}
      </blockquote>
      <p>Please log in to your Seller Dashboard to replace or upload updated documents.</p>
    `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: sellerEmail,
      subject: `Artifact Document Review: "${docTitle}" has been ${statusStr}`,
      html: getEmailWrapper(title, contentHtml),
    });
    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * FUNCTION 13: sendOrderStatusEmail
 */
export async function sendOrderStatusEmail(
  buyerEmail: string,
  buyerName: string,
  orderId: string,
  artifactTitle: string,
  status: string,
  trackingNumber?: string,
  courierName?: string
): Promise<EmailResponse> {
  const title = `Order ${status.toUpperCase()} - Dynasity-Voult`;
  const trackingInfo = trackingNumber && courierName
    ? `<div class="card">
        <p><strong>Logistics tracking details:</strong></p>
        <p>Courier: <strong>${courierName}</strong></p>
        <p>Tracking number: <code>${trackingNumber}</code></p>
       </div>`
    : "";

  let headerHtml = "";
  let bodyHtml = "";

  switch (status.toLowerCase()) {
    case "packed":
      headerHtml = "Your Order is Packed & Ready";
      bodyHtml = `<p>We are pleased to inform you that your lot <strong>&ldquo;${artifactTitle}&rdquo;</strong> has been carefully packed and is awaiting pickup by our security courier.</p>`;
      break;
    case "shipped":
      headerHtml = "Your Order Has Shipped";
      bodyHtml = `<p>Your lot <strong>&ldquo;${artifactTitle}&rdquo;</strong> is now in transit. We have dispatched it via secure, climate-controlled premium transport.</p>${trackingInfo}`;
      break;
    case "delivered":
      headerHtml = "Order Delivered Successfully";
      bodyHtml = `<p>Our courier records show that your lot <strong>&ldquo;${artifactTitle}&rdquo;</strong> was safely delivered to your shipping address.</p>`;
      break;
    case "cancelled":
      headerHtml = "Order Cancelled";
      bodyHtml = `<p>We regret to inform you that your purchase of <strong>&ldquo;${artifactTitle}&rdquo;</strong> has been cancelled. If a refund is due, it is being processed back to your original payment method.</p>`;
      break;
    default:
      headerHtml = `Order Status: ${status}`;
      bodyHtml = `<p>Your order status for <strong>&ldquo;${artifactTitle}&rdquo;</strong> has been updated to <strong>${status}</strong>.</p>${trackingInfo}`;
  }

  const contentHtml = `
    <h1>${headerHtml}</h1>
    <p>Dear ${buyerName},</p>
    ${bodyHtml}
    <p>Order ID: <span style="font-family: monospace; font-weight: bold;">${orderId}</span></p>
    <p>Thank you for choosing Dynasity-Voult curation registry.</p>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: buyerEmail,
      subject: `Dynasity-Voult Order #${orderId.slice(0, 8)} status update: ${status.toUpperCase()}`,
      html: getEmailWrapper(title, contentHtml),
    });
    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * FUNCTION 14: sendPayoutStatusEmail
 */
export async function sendPayoutStatusEmail(
  sellerEmail: string,
  sellerName: string,
  payoutId: string,
  amount: number,
  status: string,
  rejectionReason?: string
): Promise<EmailResponse> {
  const title = `Payout Request ${status.toUpperCase()} - Dynasity-Voult`;
  
  let headerHtml = "";
  let bodyHtml = "";

  switch (status.toLowerCase()) {
    case "pending":
      headerHtml = "Payout Request Submitted";
      bodyHtml = `<p>Your request to withdraw <span class="blue-text">$${amount.toLocaleString()} USD</span> has been received and is currently under review by our finance team.</p>`;
      break;
    case "approved":
      headerHtml = "Payout Request Approved";
      bodyHtml = `<p>Your payout request of <span class="blue-text">$${amount.toLocaleString()} USD</span> has been approved and is now being processed.</p>`;
      break;
    case "processing":
      headerHtml = "Payout Processing";
      bodyHtml = `<p>Your payout request of <span class="blue-text">$${amount.toLocaleString()} USD</span> is currently in transit to your registered account.</p>`;
      break;
    case "completed":
      headerHtml = "Payout Transferred Successfully";
      bodyHtml = `<p>We are pleased to inform you that your payout of <span class="blue-text">$${amount.toLocaleString()} USD</span> has been completed and transferred to your bank/UPI destination.</p>`;
      break;
    case "rejected":
      headerHtml = "Payout Request Rejected";
      bodyHtml = `
        <p>Your payout request of <span class="blue-text">$${amount.toLocaleString()} USD</span> has been rejected.</p>
        <p><strong>Reason for rejection:</strong></p>
        <blockquote style="background-color: #f3f4f6; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; font-style: italic;">
          ${rejectionReason || "Please verify your payment details and account limits."}
        </blockquote>
      `;
      break;
    default:
      headerHtml = `Payout Update: ${status}`;
      bodyHtml = `<p>Your payout request status has been updated to <strong>${status}</strong>.</p>`;
  }

  const contentHtml = `
    <h1>${headerHtml}</h1>
    <p>Dear ${sellerName},</p>
    ${bodyHtml}
    <p>Request Reference ID: <span style="font-family: monospace; font-weight: bold;">${payoutId}</span></p>
    <p>Please contact support if you have any questions regarding your funds.</p>
  `;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to: sellerEmail,
      subject: `Dynasity-Voult Payout Update: ${status.toUpperCase()} ($${amount.toLocaleString()})`,
      html: getEmailWrapper(title, contentHtml),
    });
    return { success: true, messageId: data.data?.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
