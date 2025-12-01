class EmailService {
    constructor() {
        this.serviceID = 'YOUR_SERVICE_ID';
        this.templateID = 'YOUR_TEMPLATE_ID';
        this.publicKey = 'YOUR_PUBLIC_KEY';
        this.emailjsLoaded = false;
        this.loadEmailJS();
    }
    async loadEmailJS() {
        if (typeof emailjs !== 'undefined') {
            this.emailjsLoaded = true;
            if (this.publicKey !== 'YOUR_PUBLIC_KEY') {
                emailjs.init(this.publicKey);
            }
            return;
        }
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https:
            script.onload = () => {
                this.emailjsLoaded = true;
                if (this.publicKey !== 'YOUR_PUBLIC_KEY') {
                    emailjs.init(this.publicKey);
                }
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    async validateEmail(email) {
        try {
            const response = await fetch(`https:
            const data = await response.json();
            return {
                isValid: data.is_valid_format?.value === true,
                isDeliverable: data.deliverability === 'DELIVERABLE',
                isDisposable: data.is_disposable_email?.value === true,
                isRoleEmail: data.is_role_email?.value === true,
                quality: data.quality_score || 0
            };
        } catch (error) {
            console.error('Erro ao validar e-mail:', error);
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return {
                isValid: emailRegex.test(email),
                isDeliverable: null,
                isDisposable: null,
                isRoleEmail: null,
                quality: null
            };
        }
    }
    async sendVerificationEmail(email, verificationToken) {
        try {
            await this.loadEmailJS();
            if (this.publicKey === 'YOUR_PUBLIC_KEY' || this.serviceID === 'YOUR_SERVICE_ID') {
                console.warn('EmailJS não configurado. Retornando link de verificação manual.');
                const verificationLink = `${window.location.origin}/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;
                return { 
                    success: false, 
                    message: 'E-mail não configurado. Use este link para verificar: ' + verificationLink,
                    manualLink: verificationLink
                };
            }
            const verificationLink = `${window.location.origin}/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;
            const templateParams = {
                to_email: email,
                verification_link: verificationLink,
                subject: 'Verifique seu e-mail - PMESP'
            };
            await emailjs.send(this.serviceID, this.templateID, templateParams);
            return { success: true, message: 'E-mail de verificação enviado!' };
        } catch (error) {
            console.error('Erro ao enviar e-mail de verificação:', error);
            const verificationLink = `${window.location.origin}/verify-email.html?token=${verificationToken}&email=${encodeURIComponent(email)}`;
            return { 
                success: false, 
                message: 'Erro ao enviar e-mail. Use este link para verificar: ' + verificationLink,
                manualLink: verificationLink
            };
        }
    }
    async sendPasswordResetEmail(email, resetToken) {
        try {
            await this.loadEmailJS();
            if (this.publicKey === 'YOUR_PUBLIC_KEY' || this.serviceID === 'YOUR_SERVICE_ID') {
                console.warn('EmailJS não configurado. Retornando link de recuperação manual.');
                const resetLink = `${window.location.origin}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
                return { 
                    success: false, 
                    message: 'E-mail não configurado. Use este link para redefinir: ' + resetLink,
                    manualLink: resetLink
                };
            }
            const resetLink = `${window.location.origin}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
            const templateParams = {
                to_email: email,
                reset_link: resetLink,
                subject: 'Recuperação de Senha - PMESP'
            };
            await emailjs.send(this.serviceID, this.templateID, templateParams);
            return { success: true, message: 'E-mail de recuperação enviado!' };
        } catch (error) {
            console.error('Erro ao enviar e-mail de recuperação:', error);
            const resetLink = `${window.location.origin}/reset-password.html?token=${resetToken}&email=${encodeURIComponent(email)}`;
            return { 
                success: false, 
                message: 'Erro ao enviar e-mail. Use este link para redefinir: ' + resetLink,
                manualLink: resetLink
            };
        }
    }
}
const emailService = new EmailService();
