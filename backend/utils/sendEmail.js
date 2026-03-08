const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
    let transporter;

    // Use real credentials if set, otherwise use a free ethereal email test account automatically.
    if (process.env.SMTP_HOST && process.env.SMTP_HOST !== "smtp.mailtrap.io") {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 2525,
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD,
            },
        });
    } else {
        // Automatically generate a test SMTP service account from ethereal.email if no real config!
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: testAccount.user, // generated ethereal user
                pass: testAccount.pass, // generated ethereal password
            },
        });
        console.log("-----------------------------------------");
        console.log("No SMTP credentials found in .env. Using Ethereal Email for auto-testing.");
    }

    // Define email options
    const message = {
        from: `${process.env.FROM_NAME || "Life Log"} <${process.env.FROM_EMAIL || "noreply@lifelog.com"
            }>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
    };

    // Send the email
    const info = await transporter.sendMail(message);
    console.log("Message sent (%s): %s", options.email, info.messageId);

    // Preview only available when sending through an Ethereal account
    if (!process.env.SMTP_HOST || process.env.SMTP_HOST === "smtp.mailtrap.io") {
        console.log("-----------------------------------------");
        console.log("EMAIL PREVIEW URL (CLICK TO VIEW FULL EMAIL):");
        console.log(nodemailer.getTestMessageUrl(info));
        console.log("-----------------------------------------");
    }
};

module.exports = sendEmail;
