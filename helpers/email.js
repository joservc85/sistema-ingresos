import nodemailer from 'nodemailer'

const emailRegistro = async (datos) => {
    var transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const {email, nombre, token} = datos
    // Enviar el email
    await transport.sendMail({
        from: 'sistemaingresos.com',
        to: email,
        subject: 'Confirma tu cuenta en el Sistema',
        text: 'Confirma tu cuenta en el sistemaingresos.com',
        html: `
            <p>Hola ${nombre}, comprueba tu cuenta de sistemaingresos.com</p>

            <p>Tu cuenta ya esta lista, solo confirmala en el siguiete enlace:
            <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 3000}/auth/confirmar/${token}">Confirmar Cuenta</a> </p>

            <p>Si tu no creaste esta cuenta, puedes ignorar el mensaje</p>
        
        `
    })
}

const emailOlvidePassword = async (datos) => {
    var transport = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const {email, nombre, token} = datos
    // Enviar el email
    await transport.sendMail({
        from: 'sistemaingresos.com',
        to: email,
        subject: 'Reestablece tu cuenta en el Sistema',
        text: 'Reestablece tu cuenta en el sistemaingresos.com',
        html: `
            <p>Hola ${nombre}, has solicitado reestablecer tu cuenta de sistemaingresos.com</p>

            <p>Sigue el siguiete enlace para generar un nuevo password:
            <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 3000}/auth/olvide-password/${token}">Reestablecer clave</a> </p>

            <p>Si tu no solicitaste el cambio de clave, puedes ignorar el mensaje</p>
        
        `
    })
}

export {
    emailRegistro,
    emailOlvidePassword
}