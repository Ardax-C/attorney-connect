import emailjs from 'emailjs-com';

const serviceID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const templateID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const newChatTemplateID = import.meta.env.VITE_EMAILJS_NEW_CHAT_TEMPLATE_ID;
const userID = import.meta.env.VITE_EMAILJS_USER_ID;

export async function sendEmail(to, subject, body, replyTo = '') {
    const templateParams = {
        to_email: to,
        subject: subject,
        firstName: body.firstName,
        lastName: body.lastName,
        city: body.city,
        state: body.state,
        barNumber: body.barNumber,
        email: body.email,
        username: body.username,
        time: body.time,
        reply_to: replyTo || to,
    };
    
    await emailjs.send(serviceID, templateID, templateParams, userID);

}

export async function sendNewChatEmail(to, fromFirstName, fromLastName, replyTo) {
    const templateParams = {
        to_email: to,
        from_name: `${fromFirstName} ${fromLastName}`,
        reply_to: replyTo
    };

    await emailjs.send(serviceID, newChatTemplateID, templateParams, userID);
}