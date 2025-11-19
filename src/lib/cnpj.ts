export const sanitizeCnpj = (value: string) =>
  value.replace(/\D/g, "").slice(0, 14);

export const formatCnpj = (value: string) => {
  const digits = sanitizeCnpj(value);
  if (!digits) return "";

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
};
