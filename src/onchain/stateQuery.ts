import { StateQuery, createStateQueryClient } from "@cardano-ogmios/client";
import { createContext } from "./interactionContext";

let client: StateQuery.StateQueryClient | null = null;

/**
 * Gets a state query client attached to the current tip.
 * For the syncing of metadata it's not necessary to get a state at a given point.
 */
export async function getStateQueryClient() {
  if (!client) {
    const context = await createContext(() => {
      const oldClient = client;
      client = null;
      oldClient?.shutdown();
    });
    client = await createStateQueryClient(context);
  }

  return client;
}
