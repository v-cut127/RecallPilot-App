import { format, parseISO } from "date-fns";
const currencyFormatter = new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
});
const numberFormatter = new Intl.NumberFormat("en-IE", {
    maximumFractionDigits: 0,
});
export function formatCurrency(value) {
    return currencyFormatter.format(Math.round(value));
}
export function formatNumber(value) {
    return numberFormatter.format(value);
}
export function formatDate(value) {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (Number.isNaN(date.getTime()))
        return "—";
    return format(date, "d MMM yyyy");
}
export function formatDateTime(value) {
    const date = typeof value === "string" ? parseISO(value) : value;
    if (Number.isNaN(date.getTime()))
        return "—";
    return format(date, "d MMM yyyy, HH:mm");
}
export function formatPercent(value, fractionDigits = 1) {
    return `${value.toFixed(fractionDigits)}%`;
}
export function pluralize(count, singular, plural = `${singular}s`) {
    return `${formatNumber(count)} ${count === 1 ? singular : plural}`;
}
//# sourceMappingURL=report-format.js.map