export type RegisterResult = {
    clientId: string;
    clientName: string;
    projectId: string;
    serviceRecordId: string | null;
    photos: number;
    sessions: number;
};

export type SessionStatus = 'IN_PROGRESS' | 'COMPLETED';
export type PhotoKind = 'DRAFT' | 'PROGRESS' | 'FINAL';

export type CrmClientLite = {
    id: string;
    name: string;
    surname: string;
    phone: string | null;
    email: string | null;
    country: string | null;
    notes: string | null;
    createdAt: string;
    _count?: { projects: number };
};

export type TattooSession = {
    id: string;
    projectId: string;
    sessionNumber: number;
    date: string | null;
    status: SessionStatus;
    notes: string | null;
    // Value paid on this session + payment method. A closed (COMPLETED)
    // session with both appears in Ganhos.
    amount: number | null;
    paymentMethod: string | null;
    keepPercent?: number | null;
    createdAt: string;
    updatedAt: string;
};

export type ProjectPhoto = {
    id: string;
    projectId: string;
    sessionId: string | null;
    kind: PhotoKind;
    dataUrl: string;
    createdAt: string;
};

export type TattooProject = {
    id: string;
    clientId: string;
    client?: {
        id: string;
        name: string;
        surname: string;
        phone: string | null;
        email: string | null;
        country: string | null;
    };
    serviceName: string | null;
    description: string | null;
    placement: string | null;
    size: string | null;
    cost: number | null;
    plannedSessions: number;
    createdAt: string;
    updatedAt: string;
    sessions: TattooSession[];
    photos?: ProjectPhoto[];
};

export type CrmClientFull = CrmClientLite & {
    projects: TattooProject[];
};

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
    IN_PROGRESS: 'Em progresso',
    COMPLETED: 'Concluída',
};

export const PHOTO_KIND_LABEL: Record<PhotoKind, string> = {
    DRAFT: 'Esboço',
    PROGRESS: 'Progresso',
    FINAL: 'Final',
};

export const PLACEMENT_OPTIONS = [
    'Braço',
    'Antebraço',
    'Ombro',
    'Manga (sleeve)',
    'Mão',
    'Dedos',
    'Perna',
    'Coxa',
    'Gémeo',
    'Pé',
    'Costas',
    'Peito',
    'Costelas',
    'Barriga',
    'Pescoço',
    'Cabeça',
    'Rosto',
    'Outro',
];

export const PAYMENT_METHODS = ['Dinheiro', 'MB WAY', 'Multibanco', 'Cartão'];

export const COUNTRIES = [
    'Portugal', 'Espanha', 'França', 'Alemanha', 'Itália', 'Holanda', 'Bélgica', 'Luxemburgo',
    'Suíça', 'Áustria', 'Reino Unido', 'Irlanda', 'Polónia', 'Ucrânia', 'Roménia', 'Bulgária',
    'Grécia', 'Turquia', 'Chéquia', 'Eslováquia', 'Hungria', 'Eslovénia', 'Croácia', 'Sérvia',
    'Moldávia', 'Bielorrússia', 'Lituânia', 'Letónia', 'Estónia', 'Geórgia', 'Arménia', 'Azerbaijão',
    'Cazaquistão', 'Uzbequistão', 'EUA', 'Canadá', 'Brasil', 'Angola', 'Moçambique', 'Cabo Verde',
    'Guiné-Bissau', 'São Tomé e Príncipe', 'Timor-Leste', 'Israel', 'Emirados Árabes Unidos',
    'Arábia Saudita', 'Catar', 'China', 'Índia', 'Austrália', 'Nova Zelândia', 'Noruega', 'Suécia',
    'Dinamarca', 'Finlândia', 'Islândia',
];

export const currency = (value: number | null | undefined) =>
    value === null || value === undefined
        ? '—'
        : new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

export const fmtDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString('pt-PT') : '—';

export const initials = (name: string, surname: string) =>
    `${(name || '?').charAt(0)}${(surname || '').charAt(0) || ''}`.toUpperCase();

type ProjectStats = {
    startTs: number | null;
    completedTs: number | null;
    projectDays: number | null;
    completedCount: number;
    sessionDatesCount: number;
};

// "Dias de projeto": calendar days from the first session date until the session
// tagged as completed (the last completed session when several are tagged).
export const computeProjectStats = (sessions: TattooSession[]): ProjectStats => {
    const dates = sessions
        .filter((session) => session.date)
        .map((session) => new Date(session.date as string).getTime());
    const startTs = dates.length ? Math.min(...dates) : null;
    const completed = sessions
        .filter((session) => session.status === 'COMPLETED')
        .sort((a, b) => a.sessionNumber - b.sessionNumber);
    const completedWithDate = completed
        .filter((session) => session.date)
        .map((session) => new Date(session.date as string).getTime());
    const completedTs = completedWithDate.length ? Math.max(...completedWithDate) : null;
    const dayMs = 24 * 60 * 60 * 1000;
    const projectDays =
        startTs !== null && completedTs !== null && completedTs >= startTs
            ? Math.round((completedTs - startTs) / dayMs) + 1
            : null;
    return {
        startTs,
        completedTs,
        projectDays,
        completedCount: completed.length,
        sessionDatesCount: dates.length,
    };
};

export const isProjectCompleted = (sessions: TattooSession[]) =>
    sessions.some((session) => session.status === 'COMPLETED');
