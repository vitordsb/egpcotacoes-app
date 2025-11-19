import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { http } from "@/lib/http";
import { APP_LOGO, APP_TITLE } from "@/const";
import { formatCnpj, sanitizeCnpj } from "@/lib/cnpj";

export default function SupplierLogin() {
  const [location, setLocation] = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), [location]);
  const quotationIdParam = searchParams.get("quotationId");
  const quotationId = quotationIdParam ? Number(quotationIdParam) : NaN;
  const hasQuotation = Number.isFinite(quotationId) && quotationId > 0;

  const [cnpj, setCnpj] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(hasQuotation);
  const [previewData, setPreviewData] = useState<{
    items: any[];
    quotation: any | null;
  }>({ items: [], quotation: null });

  useEffect(() => {
    if (!hasQuotation) {
      setPreviewLoading(false);
      return;
    }
    setPreviewLoading(true);
    http
      .get(`/api/supplier/preview?quotationId=${quotationId}`)
      .then(data => {
        setPreviewData({
          items: data.items ?? [],
          quotation: data.quotation ?? null,
        });
      })
      .catch(err =>
        setError(err instanceof Error ? err.message : "Erro ao carregar cotação")
      )
      .finally(() => setPreviewLoading(false));
  }, [hasQuotation, quotationId]);

  useEffect(() => {
    const cnpjParam = searchParams.get("cnpj");
    if (cnpjParam) {
      setCnpj(sanitizeCnpj(cnpjParam));
    }
    const companyParam = searchParams.get("companyName");
    if (companyParam) {
      setCompanyName(companyParam);
    }
    const passwordParam = searchParams.get("password");
    if (passwordParam) {
      setPassword(passwordParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasQuotation) {
      setError("Link inválido. Solicite um novo link ao time de compras.");
      return;
    }

    setError("");
    if (!cnpj || !companyName || !password) {
      setError("Informe CNPJ, nome fantasia e senha de acesso.");
      return;
    }

    setLoginLoading(true);
    http
      .post("/api/supplier/login", {
        quotationId,
        cnpj,
        companyName,
        password,
      })
      .then(data => {
        sessionStorage.setItem("supplierId", data.supplierId.toString());
        sessionStorage.setItem("companyName", data.companyName);
        sessionStorage.setItem("quotationId", data.quotationId.toString());
        setLocation("/supplier/quotations");
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : "Erro ao fazer login");
      })
      .finally(() => setLoginLoading(false));
  };

  const items = previewData.items ?? [];
  const quotation = previewData.quotation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <img src={APP_LOGO} alt={APP_TITLE} className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">{APP_TITLE}</h1>
          <p className="text-gray-600">
            Área exclusiva para fornecedores convidados. Utilize o link enviado pelo time de compras.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3 shadow-lg">
            <CardHeader>
              <CardTitle>Itens da cotação</CardTitle>
              <CardDescription>
                Consulte o modelo de itens e os targets definidos pelo departamento de compras.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasQuotation && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>
                    Este link não possui o identificador da cotação. Solicite um novo link ao departamento de compras.
                  </AlertDescription>
                </Alert>
              )}

              {previewLoading ? (
                <p className="text-gray-600">Carregando itens da cotação...</p>
              ) : quotation ? (
                <>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold">{quotation.title}</h2>
                    {quotation.description && (
                      <p className="text-sm text-gray-600">{quotation.description}</p>
                    )}
                  </div>
                  <div className="max-h-96 overflow-y-auto border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Componente</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Qtd</TableHead>
                          <TableHead>Qtd Compra</TableHead>
                          <TableHead>Target (R$)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-sm">{item.itemName}</TableCell>
                            <TableCell className="text-sm">{item.itemType}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.quantityToBuy}</TableCell>
                            <TableCell>
                              {item.targetPrice ? `R$ ${parseFloat(item.targetPrice).toFixed(2)}` : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <Alert variant="destructive">
                  <AlertDescription>
                    Não foi possível localizar a cotação. Verifique se o link está correto.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle>Acesso do fornecedor</CardTitle>
              <CardDescription>
                Informe seu CNPJ, nome fantasia e a senha fornecida pelo administrador desta cotação.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <label htmlFor="cnpj" className="text-sm font-medium text-gray-700">
                    CNPJ
                  </label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formatCnpj(cnpj)}
                    onChange={e => setCnpj(sanitizeCnpj(e.target.value))}
                    disabled={loginLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="companyName" className="text-sm font-medium text-gray-700">
                    Nome Fantasia
                  </label>
                  <Input
                    id="companyName"
                    placeholder="Nome da sua empresa"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={loginLoading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Senha de Acesso
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Senha temporária enviada pelo comprador"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loginLoading}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loginLoading || !hasQuotation}
                  className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                >
                  {loginLoading ? "Entrando..." : "Acessar cotação"}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-900">
                  Esta senha é válida apenas para a cotação atual e expira automaticamente após o período informado pelo
                  departamento de compras.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
