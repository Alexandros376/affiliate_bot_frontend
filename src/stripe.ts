import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = loadStripe(
  "pk_test_51T5Ii2IhZv7vmLr3BA6paRShRjXRmDFOUfE6fz5u5mHPpD7NNMG5I9Js7K6NTORr9MjYB9KSPcQIaRhH8i9dGcZe00IFqzvPOp"
);