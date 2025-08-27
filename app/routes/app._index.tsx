import React, { useState } from "react";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useActionData, useSubmit, useFetcher } from "@remix-run/react";
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  FormLayout,
  TextField,
  Button,
  DataTable,
  InlineError,
  ButtonGroup,
  Modal,
  Banner,
} from "@shopify/polaris";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";

// --- Lógica del Servidor (Backend) ---

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const routes = await prisma.shippingRoute.findMany({ orderBy: { name: "asc" } });
  const cities = await prisma.city.findMany({
    orderBy: { name: "asc" },
    include: { route: true },
  });
  return json({ routes, cities });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  if (!admin) {
    return json({ error: "No se pudo autenticar. Por favor, recarga la página e intenta de nuevo." }, { status: 401 });
  }

  const formData = await request.formData();
  const { _action, ...values } = Object.fromEntries(formData);

  try {
    if (_action === "createRoute") {
      const startKgPrice = parseFloat(values.start_kg_price as string);
      const extraKgPrice = parseFloat(values.extra_kg_price as string);
      if (isNaN(startKgPrice) || isNaN(extraKgPrice)) {
        return json({ error: "Valores de precio inválidos" }, { status: 400 });
      }
      await prisma.shippingRoute.create({
        data: {
          name: values.routeName as string,
          start_kg_price: startKgPrice,
          extra_kg_price: extraKgPrice,
        },
      });
    } else if (_action === "updateRoute") {
      const id = parseInt(values.id as string, 10);
      const startKgPrice = parseFloat(values.start_kg_price as string);
      const extraKgPrice = parseFloat(values.extra_kg_price as string);
      if (isNaN(id) || isNaN(startKgPrice) || isNaN(extraKgPrice)) {
        return json({ error: "Datos inválidos para actualizar" }, { status: 400 });
      }
      await prisma.shippingRoute.update({
        where: { id },
        data: {
          start_kg_price: startKgPrice,
          extra_kg_price: extraKgPrice,
        },
      });
    } else if (_action === "deleteRoute") {
      await prisma.shippingRoute.delete({ where: { id: Number(values.id) } });
    } else if (_action === "deleteCity") {
      await prisma.city.delete({ where: { id: Number(values.id) } });
    } else if (_action === "deleteCarrierServices") {
      const response = await admin.rest.get({ path: 'carrier_services' });
      const { carrier_services } = await response.json();
      for (const service of carrier_services) {
        if (service.name === "Envío Personalizado Ecuador") {
          console.log(`Borrando servicio existente con ID: ${service.id}`);
          await admin.rest.delete({ path: `carrier_services/${service.id}` });
        }
      }
      return json({ message: "Limpieza completada. Todos los servicios de envío anteriores han sido eliminados." });
    } else if (_action === "registerCarrierService") {
      const response = await admin.rest.post({
        path: 'carrier_services',
        data: {
          carrier_service: {
            name: "Envío Personalizado Ecuador",
            callback_url: `${process.env.SHOPIFY_APP_URL}/api/shipping-rates`,
            service_discovery: true,
          },
        },
      });
      if (!response.ok) { throw response; }
      const responseBody = await response.json();
      return json({ message: "¡ÉXITO! Servicio de envío registrado correctamente." });
    }
    return redirect("/app");
  } catch (error: any) {
    if (error.response) {
      const errorBody = await error.response.json();
      const errorMessage = JSON.stringify(errorBody.errors, null, 2);
      console.error('Mensaje de error detallado de la API de Shopify:\n', errorMessage);
      return json({ error: `Error de Shopify: ${errorMessage}` }, { status: 500 });
    }
    return json({ error: `Falló al procesar ${_action}: ${error.message}` }, { status: 500 });
  }
};

// --- Componente de la Página (Frontend) ---
export default function ShippingManagementPage() {
  const { routes, cities } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ error?: string, message?: string }>();
  const submit = useSubmit();
  const fetcher = useFetcher(); // <-- La línea que faltaba

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);

  const [routeForm, setRouteForm] = useState({
    routeName: "",
    start_kg_price: "",
    extra_kg_price: "",
  });

  const handleRouteChange = (field: keyof typeof routeForm) => (value: string) => {
    setRouteForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateRouteSubmit = () => {
    submit({ ...routeForm, _action: 'createRoute' }, { method: 'post' });
    setRouteForm({ routeName: "", start_kg_price: "", extra_kg_price: "" });
  };

  const handleDeleteRoute = (id: number) => {
    submit({ id: id.toString(), _action: 'deleteRoute' }, { method: 'post' });
  };

  const handleDeleteCity = (id: number) => {
    submit({ id: id.toString(), _action: 'deleteCity' }, { method: 'post' });
  };

  const handleOpenEditModal = (route: any) => {
    setEditingRoute(route);
    setIsEditModalOpen(true);
  };

  const handleUpdateRouteSubmit = () => {
    if (!editingRoute) return;
    submit({ ...editingRoute, _action: 'updateRoute' }, { method: 'post' });
    setIsEditModalOpen(false);
  };

  const editModal = editingRoute && (
    <Modal
      open={isEditModalOpen}
      onClose={() => setIsEditModalOpen(false)}
      title={`Editar precios para ${editingRoute?.name}`}
      primaryAction={{ content: 'Guardar Cambios', onAction: handleUpdateRouteSubmit }}
      secondaryActions={[{ content: 'Cancelar', onAction: () => setIsEditModalOpen(false) }]}
    >
      <Modal.Section>
        <FormLayout>
          <TextField
            label="Precio Kilo Inicial (2kg)"
            type="number"
            value={editingRoute?.start_kg_price.toString()}
            onChange={(value) => setEditingRoute({ ...editingRoute, start_kg_price: value })}
            autoComplete="off"
          />
          <TextField
            label="Precio Kilo Adicional"
            type="number"
            value={editingRoute?.extra_kg_price.toString()}
            onChange={(value) => setEditingRoute({ ...editingRoute, extra_kg_price: value })}
            autoComplete="off"
          />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );

  return (
    <Page title="Gestión de Envíos para Ecuador">
      {editModal}
      <Layout>
        <Layout.Section>
           <Card>
             <BlockStack gap="400">
               <Text as="h2" variant="headingMd">Paso 1: Limpieza (Si el registro falla)</Text>
               <Text>Presiona este botón para borrar cualquier servicio anterior que esté causando conflictos.</Text>
               <fetcher.Form method="post">
                 <input type="hidden" name="_action" value="deleteCarrierServices" />
                 <Button submit variant="primary" tone="critical" loading={fetcher.state === 'submitting' && fetcher.formData?.get('_action') === 'deleteCarrierServices'}>Limpiar Servicios Anteriores</Button>
               </fetcher.Form>
               {fetcher.data?.message?.includes("Limpieza") && <Banner tone="success" onDismiss={() => {}}>{fetcher.data.message}</Banner>}
             </BlockStack>
           </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Paso 2: Configuración Inicial</Text>
              <Text>Presiona este botón para registrar el calculador de envíos en tu tienda.</Text>
              <fetcher.Form method="post">
                <input type="hidden" name="_action" value="registerCarrierService" />
                <Button submit loading={fetcher.state === 'submitting' && fetcher.formData?.get('_action') === 'registerCarrierService'}>Registrar Servicio de Envío</Button>
              </fetcher.Form>
              {fetcher.data?.message?.includes("ÉXITO") && <Banner tone="success" onDismiss={() => {}}>{fetcher.data.message}</Banner>}
              {fetcher.data?.error && <InlineError message={fetcher.data.error} />}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Crear Tarifas de Trayectos</Text>
              {actionData?.error && <InlineError message={actionData.error} />}
              <FormLayout>
                <TextField
                  label="Nombre del Trayecto (Ej: Local, Regional)"
                  name="routeName"
                  value={routeForm.routeName}
                  onChange={handleRouteChange("routeName")}
                  autoComplete="off"
                  requiredIndicator
                />
                <FormLayout.Group>
                  <TextField
                    label="Precio Kilo Inicial (2kg)"
                    name="start_kg_price"
                    type="number"
                    step="0.01"
                    value={routeForm.start_kg_price}
                    onChange={handleRouteChange("start_kg_price")}
                    autoComplete="off"
                    requiredIndicator
                  />
                  <TextField
                    label="Precio Kilo Adicional"
                    name="extra_kg_price"
                    type="number"
                    step="0.01"
                    value={routeForm.extra_kg_price}
                    onChange={handleRouteChange("extra_kg_price")}
                    autoComplete="off"
                    requiredIndicator
                  />
                </FormLayout.Group>
                <Button onClick={handleCreateRouteSubmit}>Guardar Trayecto</Button>
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Trayectos Creados</Text>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric", "text"]}
                headings={["Nombre", "Precio Kilo Inicial", "Precio Kilo Adicional", "Acciones"]}
                rows={routes.map((route) => [
                  route.name,
                  route.start_kg_price,
                  route.extra_kg_price,
                  <ButtonGroup key={route.id}>
                    <Button onClick={() => handleOpenEditModal(route)}>Editar</Button>
                    <Button onClick={() => handleDeleteRoute(route.id)} destructive>Eliminar</Button>
                  </ButtonGroup>,
                ])}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">Ciudades Asignadas</Text>
            <DataTable
              columnContentTypes={["text", "text", "text", "text"]}
              headings={["Ciudad", "Provincia", "Trayecto Asignado", "Acciones"]}
              rows={cities.map((city) => [
                city.name,
                city.province,
                city.route?.name || "N/A",
                <Button key={city.id} onClick={() => handleDeleteCity(city.id)} destructive>Eliminar</Button>,
              ])}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}