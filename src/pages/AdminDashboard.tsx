import { useEffect, useState, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { http } from "@/lib/http";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO, APP_TITLE } from "@/const";
import { cn } from "@/lib/utils";
import { PenSquare, Trash2 } from "lucide-react";
import { formatCnpj, sanitizeCnpj } from "@/lib/cnpj";

interface QuotationCandidate {
  supplierId: number;
  supplierName: string;
  finalPrice: number;
}

interface QuotationObservation {
  supplierId: number;
  supplierName: string;
  note: string;
}

interface QuotationSummaryItem {
  itemId: number;
  itemName: string;
  targetPrice: number | null;
  lowestPrice: number | null;
  winningSupplierId: number | null;
  meetsTarget: boolean;
  quoteCount: number;
  candidates: QuotationCandidate[];
  quantity: number;
  quantityToBuy: number;
  observations: QuotationObservation[];
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [selectedQuotation, setSelectedQuotation] = useState<number | null>(null);
  const [newQuotationTitle, setNewQuotationTitle] = useState("");
  const [newQuotationDesc, setNewQuotationDesc] = useState("");
  const [summary, setSummary] = useState<QuotationSummaryItem[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [useTemplateItems, setUseTemplateItems] = useState(true);
  const [supplierForm, setSupplierForm] = useState({
    cnpj: "",
    companyName: "",
    daysValid: 14,
  });
  const [inviteResult, setInviteResult] = useState<{
    password: string;
    accessUrl: string;
    expiresAt: string;
    companyName: string;
    cnpj: string;
  } | null>(null);
  const [targetInputs, setTargetInputs] = useState<Record<string, string>>({});
  const [quantityInputs, setQuantityInputs] = useState<Record<number, { quantity: string; quantityToBuy: string }>>({});
  const [observationModalItem, setObservationModalItem] = useState<QuotationSummaryItem | null>(null);
  const [candidateIndexes, setCandidateIndexes] = useState<Record<number, number>>({});
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quotationsLoading, setQuotationsLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryQuotation, setSummaryQuotation] = useState<any | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [creatingQuotation, setCreatingQuotation] = useState(false);
  const [generatingAccess, setGeneratingAccess] = useState(false);
  const [updatingTargetId, setUpdatingTargetId] = useState<number | null>(null);
  const [updatingQuantityId, setUpdatingQuantityId] = useState<number | null>(null);
  const [updatingQuotation, setUpdatingQuotation] = useState(false);
  const [deletingQuotation, setDeletingQuotation] = useState(false);
  const [deletingAccessId, setDeletingAccessId] = useState<number | null>(null);
  const [supplierFilter, setSupplierFilter] = useState("");
  const [targetMinFilter, setTargetMinFilter] = useState("");
  const [targetMaxFilter, setTargetMaxFilter] = useState("");
  const formatCurrencyInput = (value: number | null | undefined) =>
    value != null
      ? value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : "";

  const normalizeDecimalInput = (raw: string) => {
    const sanitized = raw.trim();
    if (!sanitized) return "";
    if (sanitized.includes(",")) {
      return sanitized.replace(/\./g, "").replace(",", ".");
    }
    return sanitized;
  };

  const renderActiveQuotationsCard = (className?: string) => (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <CardTitle>Cotações ativas</CardTitle>
        <CardDescription>
          Selecione uma cotação para ver o resumo de preços.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
        {quotationsLoading ? (
          <p className="text-gray-600">Carregando cotações...</p>
        ) : quotations.length > 0 ? (
          quotations.map(quotation => (
            <Button
              key={`quotation-${quotation.id}`}
              variant="outline"
              className={cn(
                "w-full justify-between border-2 text-left transition-colors",
                selectedQuotation === quotation.id
                  ? "border-pink-600 bg-pink-600 text-white hover:bg-pink-600 hover:border-pink-600"
                  : "border-gray-200 bg-white text-gray-900 hover:bg-pink-50 hover:border-pink-300"
              )}
              onClick={() => setSelectedQuotation(quotation.id)}
            >
              <div className="flex flex-col text-left">
                <span className="font-semibold">{quotation.title}</span>
                <span className="text-xs">
                  Status: {quotation.status} • Vence:{" "}
                  {new Date(quotation.expiresAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <span
                className={cn(
                  "ml-3 rounded-full p-1 hover:bg-black/10",
                  selectedQuotation === quotation.id ? "text-white" : "text-gray-500"
                )}
                onClick={event => {
                  event.stopPropagation();
                  deleteQuotationById(quotation.id);
                }}
              >
                <Trash2 className="w-4 h-4" />
              </span>
            </Button>
          ))
        ) : (
          <p className="text-gray-600">Nenhuma cotação encontrada</p>
        )}
      </CardContent>
    </Card>
  );

  const renderNewQuotationCard = (className?: string) => (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Nova cotação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Título
          </label>
          <Input
            placeholder="Ex: Cotação Setembro 2024"
            value={newQuotationTitle}
            onChange={event => setNewQuotationTitle(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">
            Descrição
          </label>
          <Input
            placeholder="Descrição da cotação"
            value={newQuotationDesc}
            onChange={event => setNewQuotationDesc(event.target.value)}
          />
        </div>
        <Button
          onClick={handleCreateQuotation}
          disabled={creatingQuotation}
          className="w-full bg-pink-600 hover:bg-pink-700"
        >
          {creatingQuotation ? "Criando..." : "Criar cotação"}
        </Button>
        <label className="flex items-center gap-3 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={useTemplateItems}
            onChange={event => setUseTemplateItems(event.target.checked)}
          />
          Incluir modelo base de itens automaticamente
        </label>
      </CardContent>
    </Card>
  );

  const getTargetKey = (item: QuotationSummaryItem) => `${item.itemId}-${item.itemName}`;
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "closed" | "archived">("active");
  const [editDaysUntilExpiry, setEditDaysUntilExpiry] = useState(14);

  // Verificar se é admin
  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const fetchQuotations = useCallback(async () => {
    if (!user || user.role !== "admin") return;
    setQuotationsLoading(true);
    try {
      const data = await http.get("/api/admin/quotations");
      setQuotations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar cotações");
    } finally {
      setQuotationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const fetchSummary = useCallback(async () => {
    if (!selectedQuotation) {
      setSummary([]);
      setSummaryQuotation(null);
      return;
    }
    setSummaryLoading(true);
    try {
      const data = await http.get(`/api/admin/quotations/${selectedQuotation}/summary`);
      setSummary(data.summary ?? []);
      setSummaryQuotation(data.quotation ?? null);
      const inputs: Record<string, string> = {};
      const quantities: Record<number, { quantity: string; quantityToBuy: string }> = {};
      (data.summary ?? []).forEach((item: QuotationSummaryItem) => {
        inputs[getTargetKey(item)] = formatCurrencyInput(item.targetPrice);
        quantities[item.itemId] = {
          quantity: item.quantity.toString(),
          quantityToBuy: item.quantityToBuy.toString(),
        };
      });
      setTargetInputs(inputs);
      setQuantityInputs(quantities);
      setCandidateIndexes(prev => {
        const next: Record<number, number> = {};
        (data.summary ?? []).forEach((item: QuotationSummaryItem) => {
          const maxIndex = Math.max(0, (item.candidates?.length ?? 0) - 1);
          const prevIndex = prev[item.itemId] ?? 0;
          next[item.itemId] = Math.min(prevIndex, maxIndex);
        });
        return next;
      });
      if (data.quotation) {
        setEditTitle(data.quotation.title);
        setEditDescription(data.quotation.description ?? "");
        setEditStatus(data.quotation.status);
        const daysRemaining = Math.max(
          1,
          Math.ceil(
            (new Date(data.quotation.expiresAt).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          )
        );
        setEditDaysUntilExpiry(daysRemaining);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar resumo");
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedQuotation]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const fetchInvites = useCallback(async () => {
    if (!selectedQuotation) {
      setInvites([]);
      return;
    }
    setInvitesLoading(true);
    try {
      const data = await http.get(`/api/admin/access?quotationId=${selectedQuotation}`);
      setInvites(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar acessos");
    } finally {
      setInvitesLoading(false);
    }
  }, [selectedQuotation]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleCreateQuotation = async () => {
    if (!newQuotationTitle) {
      setError("Título da cotação é obrigatório");
      return;
    }
    setCreatingQuotation(true);
    try {
      await http.post("/api/admin/quotations", {
        title: newQuotationTitle,
        description: newQuotationDesc,
        daysUntilExpiry: 14,
        useTemplate: useTemplateItems,
      });
      setSuccess("Cotação criada com sucesso!");
      setNewQuotationTitle("");
      setNewQuotationDesc("");
      fetchQuotations();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cotação");
    } finally {
      setCreatingQuotation(false);
    }
  };

  const getCurrentCandidate = (item: QuotationSummaryItem) => {
    if (!item.candidates || item.candidates.length === 0) return null;
    const idx = candidateIndexes[item.itemId] ?? 0;
    const safeIndex = Math.min(idx, item.candidates.length - 1);
    return item.candidates[safeIndex];
  };

  const getCandidatePosition = (item: QuotationSummaryItem) => {
    const total = item.candidates?.length ?? 0;
    if (total === 0) return { index: 0, total: 0 };
    const idx = candidateIndexes[item.itemId] ?? 0;
    return { index: Math.min(idx, total - 1), total };
  };

  const handleNextCandidate = (item: QuotationSummaryItem) => {
    if (!item.candidates || item.candidates.length === 0) return;
    setCandidateIndexes(prev => {
      const currentIndex = prev[item.itemId] ?? 0;
      const nextIndex = Math.min(currentIndex + 1, item.candidates.length - 1);
      if (nextIndex === currentIndex) return prev;
      return { ...prev, [item.itemId]: nextIndex };
    });
  };

  const handleResetCandidate = (item: QuotationSummaryItem) => {
    setCandidateIndexes(prev => {
      if ((prev[item.itemId] ?? 0) === 0) return prev;
      return { ...prev, [item.itemId]: 0 };
    });
  };

  const getRowColor = (item: QuotationSummaryItem) => {
    if (!item.candidates.length) {
      return "bg-white";
    }
    if (item.targetPrice == null) {
      return "bg-white";
    }
    const idx = Math.min(candidateIndexes[item.itemId] ?? 0, item.candidates.length - 1);
    const candidate = item.candidates[idx];
    if (candidate.finalPrice <= item.targetPrice) {
      return "bg-green-50";
    }
    if (idx === 0) {
      return "bg-yellow-50";
    }
    return "bg-red-50";
  };

  const handleGenerateAccess = async () => {
    if (!selectedQuotation) {
      setError("Selecione uma cotação para gerar o acesso.");
      return;
    }
    if (!supplierForm.cnpj || !supplierForm.companyName) {
      setError("Informe o CNPJ e o nome fantasia do fornecedor.");
      return;
    }
    setGeneratingAccess(true);
    try {
      const data = await http.post("/api/admin/access", {
        quotationId: selectedQuotation,
        cnpj: supplierForm.cnpj,
        companyName: supplierForm.companyName,
        daysValid: supplierForm.daysValid,
      });
      setInviteResult({
        password: data.password,
        accessUrl: data.accessUrl,
        expiresAt: data.expiresAt,
        companyName: supplierForm.companyName,
        cnpj: supplierForm.cnpj,
      });
      setSupplierForm(prev => ({ ...prev, cnpj: "", companyName: "" }));
      setSuccess("Acesso criado com sucesso.");
      setTimeout(() => setSuccess(""), 3000);
      fetchInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar acesso");
    } finally {
      setGeneratingAccess(false);
    }
  };
  const handleTargetSave = async (item: QuotationSummaryItem) => {
    const key = getTargetKey(item);
    const value = targetInputs[key] ?? "";
    if (!value) {
      setError("Informe um valor de target válido.");
      return;
    }
    const normalized = normalizeDecimalInput(value);
    const parsed = Number(normalized);
    if (Number.isNaN(parsed)) {
      setError("Target inválido.");
      return;
    }
    setUpdatingTargetId(item.itemId);
    try {
      await http.post(`/api/admin/items/${item.itemId}/target`, {
        itemId: item.itemId,
        itemName: item.itemName,
        targetPrice: parsed,
      });
      setTargetInputs(prev => ({
        ...prev,
        [key]: formatCurrencyInput(parsed),
      }));
      setSummary(prev =>
        prev.map(existing =>
          existing.itemId === item.itemId
            ? {
                ...existing,
                targetPrice: parsed,
                meetsTarget:
                  existing.lowestPrice != null ? existing.lowestPrice <= parsed : false,
              }
            : existing
        )
      );
      setSuccess("Target atualizado com sucesso.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar target");
    } finally {
      setUpdatingTargetId(null);
    }
  };

  const supplierOptions = useMemo(() => {
    const names = new Set<string>();
    summary.forEach(item => {
      item.candidates?.forEach(candidate => {
        if (candidate.supplierName) {
          names.add(candidate.supplierName);
        }
      });
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [summary]);

  const filteredSummary = useMemo(() => {
    const supplierTerm = supplierFilter.trim().toLowerCase();
    const minTarget = targetMinFilter ? Number(targetMinFilter) : undefined;
    const maxTarget = targetMaxFilter ? Number(targetMaxFilter) : undefined;

    return summary.filter(item => {
      if (supplierTerm) {
        const hasSupplier = item.candidates?.some(candidate =>
          candidate.supplierName.toLowerCase().includes(supplierTerm)
        );
        if (!hasSupplier) return false;
      }
      if (minTarget !== undefined && targetMinFilter !== "") {
        if (item.targetPrice == null || item.targetPrice < minTarget) return false;
      }
      if (maxTarget !== undefined && targetMaxFilter !== "") {
        if (item.targetPrice == null || item.targetPrice > maxTarget) return false;
      }
      return true;
    });
  }, [summary, supplierFilter, targetMinFilter, targetMaxFilter]);

  const handleQuantitySave = async (item: QuotationSummaryItem) => {
    const inputs = quantityInputs[item.itemId];
    if (!inputs) return;
    const quantity = inputs.quantity.trim() === "" ? undefined : Number(inputs.quantity);
    const quantityToBuy = inputs.quantityToBuy.trim() === "" ? undefined : Number(inputs.quantityToBuy);
    if (
      (quantity !== undefined && Number.isNaN(quantity)) ||
      (quantityToBuy !== undefined && Number.isNaN(quantityToBuy))
    ) {
      setError("Quantidades inválidas.");
      return;
    }
    if (quantity === undefined && quantityToBuy === undefined) {
      setError("Informe ao menos uma quantidade para salvar.");
      return;
    }
    setUpdatingQuantityId(item.itemId);
    try {
      await http.post(`/api/admin/items/${item.itemId}/quantities`, {
        itemId: item.itemId,
        quantity,
        quantityToBuy,
      });
      setSummary(prev =>
        prev.map(existing =>
          existing.itemId === item.itemId
            ? {
                ...existing,
                quantity: quantity ?? existing.quantity,
                quantityToBuy: quantityToBuy ?? existing.quantityToBuy,
              }
            : existing
        )
      );
      setSuccess("Quantidades atualizadas com sucesso.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar quantidades");
    } finally {
      setUpdatingQuantityId(null);
    }
  };

  const handleQuantityInputChange = (
    itemId: number,
    field: "quantity" | "quantityToBuy",
    value: string
  ) => {
    setQuantityInputs(prev => ({
      ...prev,
      [itemId]: {
        quantity: field === "quantity" ? value : prev[itemId]?.quantity ?? "",
        quantityToBuy: field === "quantityToBuy" ? value : prev[itemId]?.quantityToBuy ?? "",
      },
    }));
  };

  const copyToClipboard = (value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setSuccess("Copiado para a área de transferência!");
      setTimeout(() => setSuccess(""), 2000);
    });
  };

  const handleUpdateQuotation = async () => {
    if (!selectedQuotation) return;
    setUpdatingQuotation(true);
    try {
      await http.post(`/api/admin/quotations/${selectedQuotation}`, {
        quotationId: selectedQuotation,
        title: editTitle,
        description: editDescription,
        status: editStatus,
        daysUntilExpiry: editDaysUntilExpiry,
      });
      setSuccess("Cotação atualizada.");
      setTimeout(() => setSuccess(""), 2000);
      fetchQuotations();
      fetchSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cotação");
    } finally {
      setUpdatingQuotation(false);
    }
  };

  const deleteQuotationById = useCallback(
    async (quotationId: number) => {
      if (
        !window.confirm(
          "Tem certeza que deseja excluir esta cotação? Os dados associados serão removidos."
        )
      ) {
        return;
      }
      setDeletingQuotation(true);
      try {
        await http.del(`/api/admin/quotations/${quotationId}`);
        if (selectedQuotation === quotationId) {
          setSelectedQuotation(null);
          setSummary([]);
          setSummaryQuotation(null);
        }
        setSuccess("Cotação excluída.");
        setTimeout(() => setSuccess(""), 2000);
        fetchQuotations();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir cotação");
      } finally {
        setDeletingQuotation(false);
      }
    },
    [fetchQuotations, selectedQuotation]
  );

  const handleDeleteQuotation = async () => {
    if (!selectedQuotation) return;
    await deleteQuotationById(selectedQuotation);
  };

  const handleDeleteAccess = async (supplierId: number) => {
    if (!window.confirm("Deseja remover este acesso?")) return;
    setDeletingAccessId(supplierId);
    try {
      await http.del(`/api/admin/access/${supplierId}`);
      setInvites(prev => prev.filter(invite => invite.id !== supplierId));
      setSuccess("Acesso removido.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao remover acesso");
    } finally {
      setDeletingAccessId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-12" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{APP_TITLE}</h1>
              <p className="text-sm text-gray-600">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Button
              variant="outline"
              onClick={() => {
                logout();
                setLocation("/");
              }}
            >
              Sair
            </Button>
          </div>
        </div>
      </div>

      <div className="w-full px-6 py-6">
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

        {selectedQuotation ? (
          <div className="grid gap-4 mb-6 grid-cols-1 xl:grid-cols-12">
            {renderActiveQuotationsCard("xl:col-span-3")}
            {renderNewQuotationCard("xl:col-span-3")}

            {selectedQuotation && (
              <>
                <Card className="xl:col-span-3">
                  <CardHeader>
                  <CardTitle>Gerar acesso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      CNPJ do fornecedor
                    </label>
                    <Input
                      placeholder="00.000.000/0000-00"
                      value={formatCnpj(supplierForm.cnpj)}
                      onChange={event =>
                        setSupplierForm(prev => ({
                          ...prev,
                          cnpj: sanitizeCnpj(event.target.value),
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Nome fantasia
                    </label>
                    <Input
                      placeholder="Nome da empresa"
                      value={supplierForm.companyName}
                      onChange={event =>
                        setSupplierForm(prev => ({ ...prev, companyName: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">
                      Validade (dias)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={supplierForm.daysValid}
                      onChange={event =>
                        setSupplierForm(prev => ({
                          ...prev,
                          daysValid: parseInt(event.target.value || "1"),
                        }))
                      }
                    />
                  </div>
                  <Button
                    onClick={handleGenerateAccess}
                    disabled={generatingAccess}
                    className="w-full bg-pink-600 hover:bg-pink-700"
                  >
                    {generatingAccess ? "Gerando..." : "Gerar acesso"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="xl:col-span-3">
                <CardHeader>
                  <CardTitle>Acessos gerados</CardTitle>
                  <CardDescription>Senhas criadas para esta cotação.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[360px] overflow-y-auto pr-2">
                  {invitesLoading ? (
                    <p className="text-gray-600">Carregando acessos...</p>
                  ) : invites.length > 0 ? (
                    invites.map(access => (
                      <div
                        key={`access-${access.id}-${access.cnpj}`}
                        className="border rounded-lg p-3 space-y-3 bg-gray-50"
                      >
                        <div className="flex items-start justify-between gap-2 text-sm font-semibold">
                          <div className="flex flex-col">
                            <span className="truncate">{access.companyName}</span>
                            <span className="text-xs font-normal text-gray-500">
                              {formatCnpj(access.cnpj)}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteAccess(access.id)}
                            disabled={deletingAccessId === access.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-gray-700">Senha:</span>
                          <code className="px-2 py-1 rounded bg-white border text-xs">
                            {access.password}
                          </code>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => copyToClipboard(access.password)}
                          >
                            Copiar senha
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-gray-700">Link:</span>
                          <span className="flex-1 min-w-[140px] text-gray-600 truncate">
                            {access.accessUrl}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => copyToClipboard(access.accessUrl)}
                          >
                            Copiar link
                          </Button>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>
                            Expira em {new Date(access.expiresAt).toLocaleDateString("pt-BR")}
                          </span>
                          {access.submittedAt ? (
                            <span className="text-green-700 font-semibold">
                              Enviado em{" "}
                              {new Date(access.submittedAt).toLocaleDateString("pt-BR")}
                            </span>
                          ) : (
                            <span className="text-yellow-700 font-semibold">Pendente</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">Nenhum acesso gerado ainda.</p>
                  )}
                </CardContent>
              </Card>
              </>
            )}
          </div>
        ) : (
          <div className="min-h-[320px] flex flex-col lg:flex-row items-stretch justify-center gap-6 mb-10">
            {renderActiveQuotationsCard("w-full max-w-3xl")}
            {renderNewQuotationCard("w-full max-w-lg")}
          </div>
        )}

        {selectedQuotation && summaryQuotation && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Preços - {summaryQuotation.title}</CardTitle>
              <CardDescription>
                Verde: Bateu o target • Branco: Ganhou no preço • Vermelho: Não bateu o target
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 mb-4 items-end">
                <div className="flex flex-col gap-2 min-w-[220px]">
                  <label className="text-sm font-medium text-gray-700">
                    Filtrar por fornecedor
                  </label>
                  <Input
                    list="supplier-options"
                    placeholder="Nome do fornecedor"
                    value={supplierFilter}
                    onChange={event => setSupplierFilter(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2 w-32">
                  <label className="text-sm font-medium text-gray-700">
                    Target mínimo
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={targetMinFilter}
                    onChange={event => setTargetMinFilter(event.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2 w-32">
                  <label className="text-sm font-medium text-gray-700">
                    Target máximo
                  </label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={targetMaxFilter}
                    onChange={event => setTargetMaxFilter(event.target.value)}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSupplierFilter("");
                    setTargetMinFilter("");
                    setTargetMaxFilter("");
                  }}
                >
                  Limpar filtros
                </Button>
              </div>
              <datalist id="supplier-options">
                {supplierOptions.map(option => (
                  <option key={option} value={option} />
                ))}
              </datalist>
              <div className="overflow-x-auto">
                {summaryLoading ? (
                  <p className="text-gray-600 px-4 py-6">Carregando resumo...</p>
                ) : filteredSummary.length === 0 ? (
                  <p className="text-gray-600 px-4 py-6">
                    Nenhum item encontrado com os filtros selecionados.
                  </p>
                ) : (
                <Table className="text-sm [&_th]:py-2 [&_td]:py-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Target (R$)</TableHead>
                      <TableHead>Preço Selecionado (R$)</TableHead>
                      <TableHead>Fornecedor Selecionado</TableHead>
                      <TableHead>Cotações Recebidas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Definir Target</TableHead>
                      <TableHead>Alternativas</TableHead>
                      <TableHead>Observações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummary.map(item => {
                      const currentCandidate = getCurrentCandidate(item);
                      const position = getCandidatePosition(item);
                      const showAlternativeInfo = position.index > 0 && item.lowestPrice != null;
                      const currentMeetsTarget =
                        currentCandidate && item.targetPrice != null
                          ? currentCandidate.finalPrice <= item.targetPrice
                          : false;
                      return (
                        <TableRow key={`summary-${getTargetKey(item)}`} className={getRowColor(item)}>
                          <TableCell className="text-xs align-top">
                            <div className="font-semibold text-sm leading-tight">{item.itemName}</div>
                            <div className="mt-2 flex flex-wrap items-end gap-2 text-[11px] text-gray-600">
                              <label className="flex flex-col gap-1">
                                <span>Qtd por item</span>
                                <Input
                                  type="number"
                                  min={0}
                                  value={quantityInputs[item.itemId]?.quantity ?? ""}
                                  onChange={e =>
                                    handleQuantityInputChange(item.itemId, "quantity", e.target.value)
                                  }
                                  className="h-8 w-20 text-xs"
                                />
                              </label>
                              <label className="flex flex-col gap-1">
                                <span>Qtd compra total</span>
                                <Input
                                  type="number"
                                  min={1}
                                  value={quantityInputs[item.itemId]?.quantityToBuy ?? ""}
                                  onChange={e =>
                                    handleQuantityInputChange(item.itemId, "quantityToBuy", e.target.value)
                                  }
                                  className="h-8 w-24 text-xs"
                                />
                              </label>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuantitySave(item)}
                                disabled={updatingQuantityId === item.itemId}
                                className="h-8"
                              >
                                Salvar
                              </Button>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">
                              Atual: {item.quantity} unidade(s) • {item.quantityToBuy} para compra
                            </p>
                          </TableCell>
                          <TableCell>
                            {item.targetPrice != null
                              ? `R$ ${formatCurrencyInput(item.targetPrice)}`
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {currentCandidate ? `R$ ${currentCandidate.finalPrice.toFixed(2)}` : "-"}
                            {showAlternativeInfo && (
                              <span className="block text-xs text-gray-500">
                                Melhor preço: R$ {item.lowestPrice?.toFixed(2)}
                              </span>
                            )}
                            {item.candidates.length > 0 && (
                              <span className="block text-xs text-gray-500">
                                Opção {position.index + 1} de {item.candidates.length}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{currentCandidate?.supplierName ?? "-"}</TableCell>
                          <TableCell>{item.candidates.length}</TableCell>
                          <TableCell>
                            {!item.candidates.length ? (
                              <span className="text-gray-600">Sem cotações</span>
                            ) : item.targetPrice == null ? (
                              <span className="text-gray-600">Target não definido</span>
                            ) : currentMeetsTarget ? (
                              <span className="text-green-700 font-semibold">✓ Bateu Target</span>
                            ) : position.index === 0 ? (
                              <span className="text-yellow-700 font-semibold">Melhor preço acima do target</span>
                            ) : (
                              <span className="text-red-700 font-semibold">✗ Não Bateu</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={targetInputs[getTargetKey(item)] ?? ""}
                                onChange={e =>
                                  setTargetInputs(prev => ({
                                    ...prev,
                                    [getTargetKey(item)]: e.target.value,
                                  }))
                                }
                                className="w-28"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleTargetSave(item)}
                                disabled={updatingTargetId === item.itemId}
                              >
                                Salvar
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleNextCandidate(item)}
                                disabled={
                                  item.candidates.length <= 1 ||
                                  position.index >= item.candidates.length - 1
                                }
                              >
                                Próximo preço
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResetCandidate(item)}
                                disabled={position.index === 0}
                              >
                                Preço anterior
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setObservationModalItem(item)}
                              disabled={item.observations.length === 0}
                            >
                              {item.observations.length
                                ? `Ver observações (${item.observations.length})`
                                : "Sem observações"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!observationModalItem} onOpenChange={(open) => !open && setObservationModalItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Observações</DialogTitle>
            <DialogDescription>
              {observationModalItem ? observationModalItem.itemName : "Notas do fornecedor"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {observationModalItem?.observations.length ? (
              observationModalItem.observations.map(observation => (
                <div
                  key={`${observationModalItem.itemId}-${observation.supplierId}`}
                  className="border rounded-lg p-3 bg-gray-50"
                >
                  <p className="font-semibold text-sm">{observation.supplierName}</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line mt-1">{observation.note}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600">Sem observações para este item.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
