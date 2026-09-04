import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, Dropdown, Row, Spinner, Table } from 'react-bootstrap';
import { BarChart3, Download, FileSpreadsheet, FileText, Percent, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

type EarningsRecord = { id: string; serviceName: string; clientName: string; serviceDate: string; grossAmount: number; commissionRate: number; commissionAmount: number; netAmount: number; staff?: { name: string } };
type EarningsData = { commissionRate: number | null; periods: { days: number; total: number; count: number }[]; chart: { date: string; total: number }[]; records: EarningsRecord[]; paymentBreakdown: { paymentMethod: string; count: number }[] };

const currency = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
const dateLabel = (value: string) => new Date(value).toLocaleDateString('pt-PT');

const Earnings: React.FC = () => {
    const { user } = useAuthStore();
    const [data, setData] = useState<EarningsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDays, setSelectedDays] = useState(30);
    const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
    const [chartGranularity, setChartGranularity] = useState<'day' | 'week' | 'month'>('day');

    useEffect(() => {
        api.get('/service-records/earnings').then((response) => setData(response.data)).finally(() => setLoading(false));
    }, []);

    const chartSeries = useMemo(() => {
        if (!data) return [];
        if (chartGranularity === 'day') return data.chart.slice(-selectedDays).map((point) => ({ label: point.date, total: Number(point.total) }));
        const grouped = new Map<string, number>();
        data.records.forEach((record) => {
            const date = new Date(record.serviceDate);
            const key = chartGranularity === 'month'
                ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                : (() => {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
                    return weekStart.toISOString().slice(0, 10);
                })();
            grouped.set(key, (grouped.get(key) || 0) + Number(record.netAmount));
        });
        return Array.from(grouped.entries()).sort(([left], [right]) => left.localeCompare(right)).slice(-12).map(([label, total]) => ({ label, total }));
    }, [data, selectedDays, chartGranularity]);

    const chartGeometry = useMemo(() => {
        const points = chartSeries;
        const max = Math.max(...points.map((point) => point.total), 1);
        return points.map((point, index) => ({
            x: (index / Math.max(points.length - 1, 1)) * 100,
            y: 100 - (point.total / max) * 86,
            value: point.total,
            date: point.label,
        }));
    }, [chartSeries]);
    const chartPoints = chartGeometry.map((point) => `${point.x},${point.y}`).join(' ');
    const chartArea = chartGeometry.length ? `0,100 ${chartPoints} 100,100` : '';
    const chartMax = useMemo(() => Math.max(...chartSeries.map((point) => point.total), 1), [chartSeries]);

    const recordsTotal = data?.records.reduce((sum, record) => sum + Number(record.netAmount), 0) || 0;

    const exportCsv = () => {
        if (!data) return;
        const rows = [['Serviço', 'Cliente', 'Staff', 'Data', 'Valor ganho', 'Valor líquido'], ...data.records.map((record) => [record.serviceName, record.clientName, record.staff?.name || '', dateLabel(record.serviceDate), record.grossAmount.toFixed(2), record.netAmount.toFixed(2)]), [], ['TOTAL', '', '', '', '', recordsTotal.toFixed(2)]];
        const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(';')).join('\n');
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a'); link.href = url; link.download = 'ganhos.csv'; link.click(); URL.revokeObjectURL(url);
    };

    const exportExcel = () => {
        if (!data) return;
        const rows = data.records.map((record) => ({ Serviço: record.serviceName, Cliente: record.clientName, Staff: record.staff?.name || '', Data: dateLabel(record.serviceDate), 'Valor ganho': record.grossAmount, 'Valor líquido': record.netAmount }));
        rows.push({ Serviço: 'TOTAL', Cliente: '', Staff: '', Data: '', 'Valor ganho': data.records.reduce((sum, record) => sum + Number(record.grossAmount), 0), 'Valor líquido': recordsTotal });
        const sheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, 'Ganhos'); XLSX.writeFile(workbook, 'ganhos.xlsx');
    };

    const exportPdf = () => {
        if (!data) return;
        const pdf = new jsPDF();
        pdf.setFontSize(18); pdf.text('Ganhos', 14, 18); pdf.setFontSize(10); if (user?.role === 'ADMIN') pdf.text(`Comissão aplicada: ${data.commissionRate}%`, 14, 26);
        let y = 38; pdf.setFont('helvetica', 'bold'); pdf.text('Serviço', 14, y); pdf.text('Cliente', 58, y); pdf.text('Data', 108, y); pdf.text('Ganho', 140, y); pdf.text('Líquido', 174, y); pdf.setFont('helvetica', 'normal');
        data.records.forEach((record) => { y += 7; if (y > 282) { pdf.addPage(); y = 18; } pdf.text(record.serviceName.slice(0, 20), 14, y); pdf.text(record.clientName.slice(0, 20), 58, y); pdf.text(dateLabel(record.serviceDate), 108, y); pdf.text(currency(record.grossAmount), 140, y); pdf.text(currency(record.netAmount), 174, y); });
        y += 10; if (y > 282) { pdf.addPage(); y = 18; } pdf.setFont('helvetica', 'bold'); pdf.text(`TOTAL LÍQUIDO: ${currency(recordsTotal)}`, 14, y);
        pdf.save('ganhos.pdf');
    };

    if (loading) return <div className="text-center py-5"><Spinner animation="border" /></div>;
    if (!data) return <div className="alert alert-danger">Não foi possível carregar os ganhos.</div>;

    return <div className="py-4">
        <div className="d-flex flex-wrap justify-content-between align-items-end gap-3 mb-4"><div><div className="text-uppercase small fw-bold text-primary mb-2">Desempenho</div><h1 className="h3 fw-bold mb-1">Ganhos</h1><p className="text-muted mb-0">Valores líquidos depois da comissão definida pelo administrador.</p></div><Dropdown><Dropdown.Toggle variant="outline-primary" className="d-flex align-items-center gap-2"><Download size={17} /> Exportar</Dropdown.Toggle><Dropdown.Menu align="end"><Dropdown.Item onClick={exportExcel}><FileSpreadsheet size={16} className="me-2" /> Excel (.xlsx)</Dropdown.Item><Dropdown.Item onClick={exportCsv}><FileText size={16} className="me-2" /> CSV</Dropdown.Item><Dropdown.Item onClick={exportPdf}><FileText size={16} className="me-2" /> PDF</Dropdown.Item></Dropdown.Menu></Dropdown></div>
        <Row className="g-3 mb-4">{data.periods.map((period) => <Col key={period.days} xs={6} xl={3}><Card className={`border-0 shadow-sm rounded-4 h-100 ${selectedDays === period.days ? 'border border-primary' : ''}`} onClick={() => setSelectedDays(period.days)} role="button"><Card.Body><div className="small text-muted mb-2">Últimos {period.days} {period.days === 1 ? 'dia' : 'dias'}</div><div className="h4 fw-bold mb-1">{currency(period.total)}</div><div className="small text-muted">{period.count} serviços</div></Card.Body></Card></Col>)}</Row>
        <Card className="border-0 shadow-sm rounded-4 mb-4"><Card.Body className="p-4"><div className="d-flex justify-content-between align-items-center mb-3"><div><h2 className="h5 fw-bold mb-1">Evolução dos ganhos</h2><p className="small text-muted mb-0">Totais líquidos por {chartGranularity === 'day' ? 'dia' : chartGranularity === 'week' ? 'semana' : 'mês'}</p></div><div className="d-flex align-items-center gap-2"><div className="btn-group btn-group-sm"><button className={`btn ${chartGranularity === 'day' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setChartGranularity('day'); setHoveredPoint(null); }}>Dia</button><button className={`btn ${chartGranularity === 'week' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setChartGranularity('week'); setHoveredPoint(null); }}>Semana</button><button className={`btn ${chartGranularity === 'month' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => { setChartGranularity('month'); setHoveredPoint(null); }}>Mês</button></div><div className="text-primary"><TrendingUp size={22} /></div></div></div><div className="earnings-chart" onMouseLeave={() => setHoveredPoint(null)}><div className="earnings-chart-body"><div className="earnings-y-axis"><span>{currency(chartMax)}</span><span>{currency(chartMax / 2)}</span><span>{currency(0)}</span></div><div className="earnings-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Gráfico de ganhos por ${chartGranularity}`}><line x1="0" y1="14" x2="100" y2="14" stroke="currentColor" opacity=".1" /><line x1="0" y1="57" x2="100" y2="57" stroke="currentColor" opacity=".1" /><line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" opacity=".18" /><polygon points={chartArea} fill="currentColor" opacity=".1" /><polyline points={chartPoints} fill="none" stroke="currentColor" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />{chartGeometry.map((point, index) => <circle key={`${point.date}-${index}`} cx={point.x} cy={point.y} r={hoveredPoint === index ? 2.2 : 1.2} fill="currentColor" stroke="#fff" strokeWidth=".8" vectorEffect="non-scaling-stroke" onMouseEnter={() => setHoveredPoint(index)} />)}</svg>{hoveredPoint !== null && chartGeometry[hoveredPoint] && <div className="earnings-tooltip" style={{ left: `${chartGeometry[hoveredPoint].x}%`, top: `${chartGeometry[hoveredPoint].y}%` }}><strong>{chartGranularity === 'day' ? dateLabel(chartGeometry[hoveredPoint].date) : chartGeometry[hoveredPoint].date}</strong><span>{currency(chartGeometry[hoveredPoint].value)}</span></div>}</div></div><div className="d-flex justify-content-between small text-muted mt-2"><span>{chartGranularity === 'day' ? `${selectedDays} dias atrás` : chartGranularity === 'week' ? 'Semanas anteriores' : 'Meses anteriores'}</span><span>Atual</span></div></div></Card.Body></Card>
        <Card className="border-0 shadow-sm rounded-4 mb-4"><Card.Body className="p-4"><div className="d-flex justify-content-between align-items-center mb-3"><div><h2 className="h5 fw-bold mb-1">Histórico diário</h2><p className="small text-muted mb-0">Total líquido de cada dia dos últimos 30 dias.</p></div><span className="fw-bold text-primary">{currency(data.chart.reduce((sum, point) => sum + point.total, 0))}</span></div><div className="table-responsive" style={{ maxHeight: 360 }}><Table hover className="align-middle mb-0"><thead className="table-light"><tr><th>Dia</th><th className="text-end">Total líquido</th></tr></thead><tbody>{[...data.chart].reverse().map((point) => <tr key={point.date}><td>{dateLabel(point.date)}</td><td className="text-end fw-semibold">{currency(point.total)}</td></tr>)}</tbody></Table></div></Card.Body></Card>
        <Card className="border-0 shadow-sm rounded-4 mb-4"><Card.Body className="p-4"><div className="mb-3"><h2 className="h5 fw-bold mb-1">Serviços por pagamento</h2><p className="small text-muted mb-0">Quantidade de serviços por método de pagamento.</p></div><Table hover className="align-middle mb-0"><thead className="table-light"><tr><th>Método</th><th className="text-end">Serviços</th></tr></thead><tbody>{data.paymentBreakdown.map((item, index) => <tr key={item.paymentMethod}><td><span className="payment-marker" style={{ backgroundColor: ['#0d6efd', '#198754', '#6f42c1', '#fd7e14'][index] }} />{item.paymentMethod}</td><td className="text-end fw-bold">{item.count}</td></tr>)}</tbody></Table></Card.Body></Card>
        <Card className="border-0 shadow-sm rounded-4"><Card.Body className="p-4"><div className="d-flex justify-content-between align-items-center mb-3"><div className="d-flex align-items-center gap-2"><BarChart3 size={20} className="text-primary" /><h2 className="h5 fw-bold mb-0">Registo de serviços</h2></div>{user?.role === 'ADMIN' && <span className="small text-muted"><Percent size={14} /> Comissão individual aplicada</span>}</div><div className="table-responsive"><Table hover className="align-middle mb-0"><thead><tr><th>Serviço</th>{user?.role === 'ADMIN' && <th>Staff</th>}<th>Cliente</th><th>Data</th><th className="text-end">Valor ganho</th><th className="text-end">Valor líquido</th></tr></thead><tbody>{data.records.map((record) => <tr key={record.id}><td className="fw-semibold">{record.serviceName}</td>{user?.role === 'ADMIN' && <td>{record.staff?.name || 'Admin'}</td>}<td>{record.clientName}</td><td className="text-muted">{dateLabel(record.serviceDate)}</td><td className="text-end">{currency(record.grossAmount)}</td><td className="text-end fw-bold">{currency(record.netAmount)}</td></tr>)}</tbody><tfoot><tr><th colSpan={user?.role === 'ADMIN' ? 5 : 4}>TOTAL</th><th className="text-end">{currency(recordsTotal)}</th></tr></tfoot></Table></div>{data.records.length === 0 && <div className="text-center py-5 text-muted">Ainda não existem serviços registados.</div>}</Card.Body></Card>
        <style>{`.earnings-chart { height: 240px; color: #0d6efd; } .earnings-chart-body { height: 210px; display: flex; gap: 10px; } .earnings-y-axis { width: 58px; display: flex; flex-direction: column; justify-content: space-between; align-items: flex-end; color: #6c757d; font-size: .7rem; padding: 2px 0; } .earnings-plot { position: relative; flex: 1; min-width: 0; } .earnings-plot svg { width: 100%; height: 210px; overflow: visible; } .earnings-tooltip { position: absolute; transform: translate(-50%, -115%); z-index: 2; pointer-events: none; display: flex; flex-direction: column; gap: 2px; background: #172033; color: #fff; padding: 7px 10px; border-radius: 8px; font-size: .72rem; white-space: nowrap; box-shadow: 0 8px 20px rgba(15, 23, 42, .2); } .earnings-tooltip span { color: #8ff0c2; font-weight: 700; } .payment-marker { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 8px; }`}</style>
    </div>;
};

export default Earnings;
