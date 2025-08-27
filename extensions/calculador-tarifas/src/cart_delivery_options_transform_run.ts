import type {
  CartDeliveryOptionsTransformRunInput,
  CartDeliveryOptionsTransformRunResult,
} from "../generated/api";

const NO_CHANGES: CartDeliveryOptionsTransformRunResult = {
  operations: [],
};

type Configuration = {};

export async function cartDeliveryOptionsTransformRun(input: CartDeliveryOptionsTransformRunInput): Promise<CartDeliveryOptionsTransformRunResult> {
  const configuration: Configuration = input?.deliveryCustomization?.metafield?.jsonValue ?? {};

  const { cart, shop } = input;
  const { city, provinceCode } = cart.deliveryGroups[0].deliveryAddress;

  const response = await fetch(`${shop.url}/api/shipping-rates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      rate: {
        origin: {},
        destination: {
          city,
          province: provinceCode,
        },
        items: cart.lines.map((line) => ({
          quantity: line.quantity,
          grams: line.merchandise.weight,
        })),
      },
    }),
  });

  if (!response.ok) {
    return NO_CHANGES;
  }

  const { rates } = await response.json();

  if (!rates || rates.length === 0) {
    return NO_CHANGES;
  }

  return {
    operations: rates.map((rate) => ({
      rename: {
        deliveryOptionHandle: rate.service_code,
        title: rate.service_name,
      },
    })),
  };
};
