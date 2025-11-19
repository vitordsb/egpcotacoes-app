import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { http } from "@/lib/http";
import { APP_LOGO, APP_TITLE } from "@/const";

interface QuotationItem {
  id: number;
  itemName: string;
  itemType: string;
  quantity: number;
  quantityToBuy: number;
  targetPrice?: string | null;
}

interface QuotationDetails {
  id: number;
  title: string;
  description?: string | null;
  expiresAt: string;
  status: string;
}

type PriceEntry = {
  priceInRealInput: string;
  priceInDollarInput: string;
  ipiInput: string;
  icmsInput: string;
  finalPrice?: number | null;
};

type EditablePriceField = "priceInRealInput" | "priceInDollarInput" | "ipiInput" | "icmsInput";
type PriceData = Record<number, PriceEntry>;

export default function SupplierQuotation() {
  const [, setLocation] = useLocation();
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [quotationId, setQuotationId] = useState<number | null>(null);
  const [quotation, setQuotation] = useState<QuotationDetails | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [priceData, setPriceData] = useState<PriceData>({});
  const [observations, setObservations] = useState<Record<number, string>>({});
  const [observationEditor, setObservationEditor] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [savingPriceId, setSavingPriceId] = useState<number | null>(null);
  const [savingObservationId, setSavingObservationId] = useState<number | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [savingAllPrices, setSavingAllPrices] = useState(false);

  const formatCurrencyInput = (value?: number | null, fractionDigits = 2) =>
    value != null
      ? value.toLocaleString("pt-BR", {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        })
      : "";

  const formatPercentageInput = (value?: number | null) =>
    value != null
      ? value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
      : "";

  const normalizeDecimalInput = (raw?: string) => {
    if (!raw) return undefined;
    const sanitized = raw.replace(/\s/g, "");
    if (!sanitized) return undefined;
    if (sanitized.includes(",")) {
      return sanitized.replace(/\./g, "").replace(",", ".");
    }
    return sanitized;
  };

  const handleObservationChange = (itemId: number, value: string) => {
    setObservations(prev => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const handleObservationSave = async (item: QuotationItem) => {
    if (!supplierId || !quotationId) return;
    if (isSubmitted) {
      setError("Cotação já enviada. Não é possível editar.");
      return;
    }
    const note = (observations[item.id] ?? "").trim();
    if (!note) {
      setError("Escreva uma observação antes de salvar.");
      return;
    }
    setSavingObservationId(item.id);
    try {
      await http.post("/api/supplier/observation", {
        quotationId,
        supplierId,
        quotationItemId: item.id,
        observation: note,
      });
      setSuccess("Observação salva!");
      setTimeout(() => setSuccess(""), 3000);
      setObservationEditor(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar observação");
    } finally {
      setSavingObservationId(null);
    }
  };

  const parseInputToNumber = (raw?: string) => {
    const normalized = normalizeDecimalInput(raw);
    if (normalized === undefined) return undefined;
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const hasTooManyDecimals = (raw?: string) => {
    const normalized = normalizeDecimalInput(raw);
    if (!normalized) return false;
    const parts = normalized.split(".");
    return parts.length > 1 && parts[1].length > 3;
  };

  const getStateKey = (item: QuotationItem) => item.id;
  const getRowKey = (item: QuotationItem, index: number) =>
    `${item.id}-${item.itemName}-${item.itemType}-${index}`;

  const computePreviewFinalPrice = (entry?: PriceEntry): number | undefined => {
    if (!entry) return undefined;
    const basePrice = parseInputToNumber(entry.priceInRealInput);
    if (basePrice == null) return entry.finalPrice ?? undefined;
    const ipi = parseInputToNumber(entry.ipiInput) ?? 0;
    const icms = parseInputToNumber(entry.icmsInput) ?? 0;
    return basePrice + basePrice * (ipi / 100) + basePrice * (icms / 100);
  };

  type PreparedPriceResult =
    | { status: "skip" }
    | { status: "error"; message: string }
    | {
        status: "ok";
        key: number;
        priceInReal?: number;
        priceInDollar?: number;
        ipiPercentage?: number;
        icmsPercentage?: number;
      };

  const preparePriceForSubmission = (
    item: QuotationItem,
    options?: { allowSkip?: boolean }
  ): PreparedPriceResult => {
    const { allowSkip = false } = options ?? {};
    const key = getStateKey(item);
    const data = priceData[key];
    if (!data) {
      return allowSkip
        ? { status: "skip" }
        : { status: "error", message: "Informe os dados do item antes de salvar." };
    }

    if (hasTooManyDecimals(data.priceInRealInput) || hasTooManyDecimals(data.priceInDollarInput)) {
      return { status: "error", message: "Os preços devem ter no máximo três casas decimais." };
    }

    const priceInReal = parseInputToNumber(data.priceInRealInput);
    const priceInDollar = parseInputToNumber(data.priceInDollarInput);

    if (!priceInReal && !priceInDollar) {
      return allowSkip
        ? { status: "skip" }
        : { status: "error", message: "Informe pelo menos um valor (Real ou Dólar)" };
    }

    const ipiPercentage = parseInputToNumber(data.ipiInput);
    const icmsPercentage = parseInputToNumber(data.icmsInput);

    return {
      status: "ok",
      key,
      priceInReal,
      priceInDollar,
      ipiPercentage,
      icmsPercentage,
    };
  };

  const persistPrice = async (
    item: QuotationItem,
    payload: Extract<PreparedPriceResult, { status: "ok" }>,
    options?: { silent?: boolean }
  ) => {
    if (!supplierId || !quotationId) return;
    const { priceInReal, priceInDollar, ipiPercentage, icmsPercentage, key } = payload;
    const result = await http.post<{ finalPrice: number }>("/api/supplier/price", {
      quotationId,
      supplierId,
      quotationItemId: item.id,
      priceInReal,
      priceInDollar,
      ipiPercentage,
      icmsPercentage,
    });
    if (!options?.silent) {
      setSuccess("Preço salvo com sucesso!");
      setTimeout(() => setSuccess(""), 3000);
    }
    setPriceData(prev => ({
      ...prev,
      [key]: {
        priceInRealInput:
          priceInReal != null ? formatCurrencyInput(priceInReal) : prev[key]?.priceInRealInput ?? "",
        priceInDollarInput:
          priceInDollar != null ? formatCurrencyInput(priceInDollar, 4) : prev[key]?.priceInDollarInput ?? "",
        ipiInput: ipiPercentage != null ? formatPercentageInput(ipiPercentage) : prev[key]?.ipiInput ?? "",
        icmsInput: icmsPercentage != null ? formatPercentageInput(icmsPercentage) : prev[key]?.icmsInput ?? "",
        finalPrice: result.finalPrice,
      },
    }));
  };

  useEffect(() => {
    const storedSupplierId = sessionStorage.getItem("supplierId");
    const storedQuotationId = sessionStorage.getItem("quotationId");

    if (!storedSupplierId || !storedQuotationId) {
      setLocation("/supplier/login");
      return;
    }

    setSupplierId(parseInt(storedSupplierId));
    setQuotationId(parseInt(storedQuotationId));
  }, [setLocation]);

  useEffect(() => {
    if (!quotationId || !supplierId) return;
    setInitialLoading(true);
    setError("");
    http
      .get(
        `/api/supplier/quotation?quotationId=${quotationId}&supplierId=${supplierId}`
      )
      .then(data => {
        const fetchedItems = data.items ?? [];
        const quotes = data.existingQuotes ?? [];
        const quoteMap = new Map(quotes.map((quote: any) => [quote.quotationItemId, quote]));
        setQuotation(data.quotation ?? null);
        setItems(fetchedItems);
        setPriceData(prev => {
          const mapped: PriceData = {};
          fetchedItems.forEach(item => {
            const quote = quoteMap.get(item.id);
            const key = getStateKey(item);
            mapped[key] = {
              priceInRealInput: quote?.priceInReal
                ? formatCurrencyInput(parseFloat(quote.priceInReal))
                : "",
              priceInDollarInput: quote?.priceInDollar
                ? formatCurrencyInput(parseFloat(quote.priceInDollar), 4)
                : "",
              ipiInput: quote?.ipiPercentage
                ? formatPercentageInput(parseFloat(quote.ipiPercentage))
                : "",
              icmsInput: quote?.icmsPercentage
                ? formatPercentageInput(parseFloat(quote.icmsPercentage))
                : "",
              finalPrice: quote?.finalPrice ? parseFloat(quote.finalPrice) : undefined,
            };
          });
          return mapped;
        });
        if (data.observations) {
          const obsMap: Record<number, string> = {};
          data.observations.forEach((observation: any) => {
            obsMap[observation.quotationItemId] = observation.note;
          });
          setObservations(obsMap);
        }
        if (data.supplier?.submittedAt) {
          setIsSubmitted(true);
          setSubmittedAt(data.supplier.submittedAt);
        } else {
          setIsSubmitted(false);
          setSubmittedAt(null);
        }
      })
      .catch(err =>
        setError(err instanceof Error ? err.message : "Erro ao carregar cotação")
      )
      .finally(() => setInitialLoading(false));
  }, [quotationId, supplierId]);

  const handlePriceChange = (item: QuotationItem, field: EditablePriceField, value: string) => {
    if (isSubmitted) {
      setError("Cotação já enviada. Não é possível editar.");
      return;
    }
    const key = getStateKey(item);
    setPriceData(prev => ({
      ...prev,
      [key]: {
        priceInRealInput: prev[key]?.priceInRealInput ?? "",
        priceInDollarInput: prev[key]?.priceInDollarInput ?? "",
        ipiInput: prev[key]?.ipiInput ?? "",
        icmsInput: prev[key]?.icmsInput ?? "",
        finalPrice: prev[key]?.finalPrice,
        [field]: value,
      },
    }));
  };

  const handleSavePrice = async (item: QuotationItem) => {
    if (!supplierId || !quotationId) return;
    if (isSubmitted) {
      setError("Cotação já enviada. Não é possível editar.");
      return;
    }

    const prepared = preparePriceForSubmission(item);
    if (prepared.status === "error") {
      setError(prepared.message);
      return;
    }
    if (prepared.status === "skip") {
      setError("Informe os dados do item antes de salvar.");
      return;
    }

    setSavingPriceId(item.id);
    try {
      await persistPrice(item, prepared);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar preço");
    } finally {
      setSavingPriceId(null);
    }
  };

  const hasAnySavedItem = () => {
    return Object.values(priceData).some(entry => entry?.finalPrice != null);
  };

  const hasAnyPriceInput = () => {
    return items.some(item => {
      const entry = priceData[getStateKey(item)];
      return Boolean(entry?.priceInRealInput?.trim() || entry?.priceInDollarInput?.trim());
    });
  };

  const handleSaveAllPrices = async () => {
    if (!supplierId || !quotationId) return;
    if (isSubmitted) {
      setError("Cotação já enviada. Não é possível editar.");
      return;
    }
    setSavingAllPrices(true);
    let savedCount = 0;
    try {
      for (const item of items) {
        const prepared = preparePriceForSubmission(item, { allowSkip: true });
        if (prepared.status === "skip") {
          continue;
        }
        if (prepared.status === "error") {
          setError(prepared.message);
          return;
        }
        await persistPrice(item, prepared, { silent: true });
        savedCount += 1;
      }
      if (savedCount > 0) {
        setSuccess(`Preço salvo para ${savedCount} item${savedCount > 1 ? "s" : ""}!`);
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError("Preencha os valores de algum item antes de salvar.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar preços");
    } finally {
      setSavingAllPrices(false);
      setSavingPriceId(null);
    }
  };

  const handleSubmitQuotation = async () => {
    if (!supplierId || !quotationId) return;
    if (isSubmitted) {
      setError("Cotação já foi enviada.");
      return;
    }

    if (!hasAnySavedItem()) {
      setError("Cadastre ao menos um item antes de enviar a cotação.");
      return;
    }

    setSubmitLoading(true);
    try {
      const result = await http.post<{ submittedAt: string }>("/api/supplier/submit", {
        quotationId,
        supplierId,
      });
      setSuccess("Cotação enviada com sucesso!");
      setIsSubmitted(true);
      setSubmittedAt(result.submittedAt);
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar cotação");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Carregando cotação...</p>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Alert variant="destructive">
          <AlertDescription>Erro ao carregar cotação: {error || "Cotação não encontrada"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const daysRemaining = quotation
    ? Math.ceil((new Date(quotation.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="w-full px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-12" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{APP_TITLE}</h1>
              <p className="text-sm text-gray-600">Sistema de Cotação</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              sessionStorage.clear();
              setLocation("/supplier/login");
            }}
          >
            Sair
          </Button>
        </div>
      </div>

      <div className="w-full px-6 py-8">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{quotation?.title}</CardTitle>
            <CardDescription>
              {quotation?.description}
              {daysRemaining > 0 && (
                <span className="block mt-2 text-sm font-semibold text-orange-600">
                  Prazo restante: {daysRemaining} dias
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Preenchimento de Preços</CardTitle>
              <CardDescription>
                Preencha os preços dos itens abaixo. Você pode informar valores em Real ou Dólar.
                IPI e ICMS são opcionais.
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              onClick={handleSaveAllPrices}
              disabled={isSubmitted || savingAllPrices || !hasAnyPriceInput()}
            >
              {savingAllPrices ? "Salvando..." : "Salvar todos"}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Qtd Compra</TableHead>
                    <TableHead>Target (R$)</TableHead>
                    <TableHead>Preço (R$)</TableHead>
                    <TableHead>Preço (US$)</TableHead>
                    <TableHead>IPI %</TableHead>
                    <TableHead>ICMS %</TableHead>
                    <TableHead>Preço Final c/ impostos</TableHead>
                    <TableHead>Total (Qtd Compra)</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => {
                    const stateKey = getStateKey(item);
                    const entry = priceData[stateKey];
                    const finalPrice = computePreviewFinalPrice(entry);
                    const totalPrice = finalPrice != null ? finalPrice * item.quantityToBuy : null;

                    return (
                      <TableRow key={getRowKey(item, index)}>
                        <TableCell className="font-medium text-sm">{item.itemName}</TableCell>
                        <TableCell className="text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-sm">{item.itemType}</TableCell>
                        <TableCell className="text-sm">{item.quantityToBuy}</TableCell>
                        <TableCell className="font-semibold">
                          {item.targetPrice
                            ? `R$ ${parseFloat(item.targetPrice).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "-"}
                        </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={entry?.priceInRealInput ?? ""}
                        onChange={e => handlePriceChange(item, "priceInRealInput", e.target.value)}
                        className="w-24"
                        disabled={isSubmitted}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={entry?.priceInDollarInput ?? ""}
                        onChange={e => handlePriceChange(item, "priceInDollarInput", e.target.value)}
                        className="w-24"
                        disabled={isSubmitted}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={entry?.ipiInput ?? ""}
                        onChange={e => handlePriceChange(item, "ipiInput", e.target.value)}
                        className="w-20"
                        disabled={isSubmitted}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={entry?.icmsInput ?? ""}
                        onChange={e => handlePriceChange(item, "icmsInput", e.target.value)}
                        className="w-20"
                        disabled={isSubmitted}
                      />
                    </TableCell>
                        <TableCell className="font-semibold">
                          {finalPrice != null
                            ? `R$ ${finalPrice.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {totalPrice != null
                            ? `R$ ${totalPrice.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setObservationEditor(prev => (prev === item.id ? null : item.id))}
                              disabled={isSubmitted}
                            >
                              {observations[item.id]?.trim() ? "Editar observação" : "Escrever observação"}
                            </Button>
                            {observationEditor === item.id && (
                              <>
                                <Textarea
                                  value={observations[item.id] ?? ""}
                                  onChange={e => handleObservationChange(item.id, e.target.value)}
                                  rows={3}
                                  placeholder="Descreva detalhes sobre a disponibilidade deste item…"
                                  disabled={isSubmitted}
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleObservationSave(item)}
                                    disabled={savingObservationId === item.id || isSubmitted}
                                  >
                                    Salvar observação
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setObservationEditor(null)}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </>
                            )}
                            {observations[item.id]?.trim() && observationEditor !== item.id && (
                              <span className="text-xs text-gray-500">Observação salva</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleSavePrice(item)}
                            disabled={
                              savingPriceId === item.id ||
                              (!parseInputToNumber(entry?.priceInRealInput) &&
                                !parseInputToNumber(entry?.priceInDollarInput)) ||
                              isSubmitted
                            }
                            className="bg-pink-600 hover:bg-pink-700"
                          >
                            Salvar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex flex-col gap-3">
          {isSubmitted && submittedAt && (
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <AlertDescription>
                Cotação enviada em {new Date(submittedAt).toLocaleString("pt-BR")}. Edições foram bloqueadas.
              </AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm text-gray-600">
              Apenas os itens com preço salvo serão enviados para análise.
            </p>
            <Button
              onClick={handleSubmitQuotation}
              disabled={isSubmitted || submitLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitted
                ? "Cotação já enviada"
                : submitLoading
                ? "Enviando..."
                : "Enviar cotação"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
