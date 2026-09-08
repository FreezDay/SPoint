// Fixed price list for tattoo services (shown in "Registar serviço" and CRM).
// Service name is the key; amount is auto-filled in the register form.
// ADJUST THESE PRICES to the studio's real price list.
export const TATTOO_SERVICE_PRICES: Record<string, number> = {
    'Tatuagem pequena / Маленьке татуювання': 60,
    'Tatuagem média / Середнє татуювання': 120,
    'Tatuagem grande / Велике татуювання': 200,
    'Tatuagem a cores / Кольорове татуювання': 150,
    'Fine line / Файн-лайн': 80,
    'Blackwork / Блекворк': 100,
    'Realismo / Реалізм': 180,
    'Cover-up / Перекриття татуювання': 150,
    'Retoque / Корекція татуювання': 40,
    'Desenho personalizado / Індивідуальний ескіз': 30,
    'Sessão adicional / Додаткова сесія': 80,
};

export const TATTOO_SERVICE_OPTIONS = Object.keys(TATTOO_SERVICE_PRICES);
