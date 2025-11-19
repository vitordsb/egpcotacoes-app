import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { http } from "@/lib/http";
import { useState } from "react";
import { useLocation } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Home() {
  const { user, logout, isAuthenticated, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAdminLoginSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage(null);
    try {
      setSubmitting(true);
      await http.post("/api/auth/login", { login, password });
      await refresh();
      setLocation("/admin/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Falha ao autenticar. Tente novamente."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <img src={APP_LOGO} alt={APP_TITLE} className="h-20 mx-auto mb-6" />
          <h1 className="text-5xl font-bold text-gray-900 mb-4">{APP_TITLE}</h1>
          <p className="text-xl text-gray-600">
            Sistema de Cotação para o Departamento de Compras
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-t-lg">
              <CardTitle>Para Fornecedores</CardTitle>
              <CardDescription className="text-pink-100">
                Acesse o sistema para preencher suas cotações
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-6">
                Você recebeu um CNPJ e uma senha temporária válida por 14 dias.
                Use-os para acessar o formulário de cotação e preencher os preços dos itens solicitados.
              </p>
              <Button
                onClick={() => setLocation("/supplier/access")}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white"
              >
                Acessar como Fornecedor
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-t-lg">
              <CardTitle>Para Administrador</CardTitle>
              <CardDescription className="text-gray-300">
                Gerencie cotações e compare preços
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-6">
                Acesse o painel administrativo para criar cotações, gerar senhas para fornecedores
                e visualizar o resumo de preços com comparativos.
              </p>
              {isAuthenticated && user?.role === "admin" ? (
                <Button
                  onClick={() => setLocation("/admin/dashboard")}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                >
                  Ir para Painel Admin
                </Button>
              ) : (
                <form className="space-y-4" onSubmit={handleAdminLoginSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="admin-login">Login</Label>
                    <Input
                      id="admin-login"
                      value={login}
                      autoComplete="username"
                      placeholder="Digite o login"
                      onChange={event => setLogin(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Senha</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      placeholder="Digite a senha"
                      onChange={event => setPassword(event.target.value)}
                      required
                    />
                  </div>
                  {errorMessage && (
                    <p className="text-sm text-red-500">{errorMessage}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                    disabled={submitting}
                  >
                    {submitting ? "Entrando..." : "Login como Administrador"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Como Funciona</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-900 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Para Fornecedores:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Faça login com seu CNPJ e senha temporária</li>
                <li>Preencha os preços dos itens em Real ou Dólar</li>
                <li>Informe IPI e ICMS se aplicável (opcionais)</li>
                <li>O sistema calcula automaticamente o preço final</li>
                <li>Você pode editar suas cotações durante os 14 dias</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Para Administrador:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Crie uma nova cotação com título e descrição</li>
                <li>Gere senhas temporárias para os fornecedores</li>
                <li>Defina o target de compra para cada item</li>
                <li>Acompanhe os preços conforme os fornecedores preenchem</li>
                <li>Visualize o resumo com o fornecedor de melhor preço</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {isAuthenticated && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Você está logado como: <strong>{user?.name}</strong>
            </p>
            <Button
              variant="outline"
              onClick={() => {
                logout();
              }}
            >
              Fazer Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
