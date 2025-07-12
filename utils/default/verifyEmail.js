const nodemailer = require('nodemailer');

// Function to send email
async function sendMail({receiver, subject,service,host, htmlContent,content,cc,bcc}) {
  // Create a nodemailer transporter
  const transporterConfig = {
    service,
      auth: {
        user: process.env.NODMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASS,
      },
    }; 

    if (host) {
      transporterConfig.host = host;
      transporterConfig.port = 587;
      transporterConfig.secure = false; // Use STARTTLS
    }

  // Create transporter
  const transporter = nodemailer.createTransport(transporterConfig);
  // Construct email message
  const mailOptions = {
    from: process.env.NODMAILER_EMAIL,
    to: receiver,
    subject: subject,
    html: htmlContent || ` `,                   // HTML content (can be empty string)
    text: content || '',                       // Plain text content
    cc: cc || undefined,                 // CC recipients (optional)
    bcc: bcc || undefined, 
  };
  
  // Send email
  await transporter.sendMail(mailOptions);
}

module.exports = { sendMail };