import { create } from "zustand";
import {
  acceptJob,
  advance,
  buyListing,
  buyYard,
  cancelShipment,
  blankWorld,
  warmWorld,
  dispatchLoop,
  divertToYard,
  fire,
  foundCompany,
  hire,
  repairVehicle,
  reposition,
  resumeStored,
  sellVehicle,
  sellYard,
  SIM_PER_REAL_HOUR,
  type World,
} from "./sim";

const KEY = "practical-miles-v1";

type DeskState = {
  world: World;
  paused: boolean;
  ready: boolean;
  frame: number;
  boot: () => void;
  togglePause: () => void;
  tick: (realSeconds: number) => void;
  found: (name: string, zip: string) => string | null;
  holdJob: (id: string | null) => void;
  accept: (jobId: string, vehicleId: string, driverId: string, trailerId?: string, force?: boolean, stage?: boolean) => string | null;
  cancel: (shipmentId: string) => string | null;
  hireDriver: (id: string) => string | null;
  fireDriver: (id: string) => string | null;
  buyTruck: (listingId: string, warehouseId: string) => string | null;
  sellTruck: (id: string) => string | null;
  repair: (id: string) => string | null;
  buyWarehouse: (id: string) => string | null;
  sellWarehouse: (id: string) => string | null;
  sendTruck: (vehicleId: string, zip: string, driverId?: string) => string | null;
  divert: (shipmentId: string, warehouseId: string) => string | null;
  rollStored: (shipmentId: string, vehicleId: string, driverId: string, trailerId?: string) => string | null;
  dispatch: (warehouseId: string, vehicleId: string, driverId: string, shipmentIds: string[], trailerId?: string, atDawn?: boolean) => string | null;
  restart: (name: string, zip: string) => string | null;
  abandon: () => void;
  exportSave: () => string;
  importSave: (raw: string) => string | null;
};

let lastPersist = 0;

function persist(world: World, paused: boolean, force = true) {
  const now = Date.now();
  if (!force && now - lastPersist < 4000) return;
  lastPersist = now;
  try {
    localStorage.setItem(KEY, JSON.stringify({ world, paused, savedAt: now }));
  } catch {
    /* ignore quota */
  }
}

export const useDesk = create<DeskState>((set, get) => ({
  world: blankWorld(),
  paused: false,
  ready: false,
  frame: 0,
  boot: () => {
    if (get().ready) return;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { world: World; paused: boolean; savedAt: number };
        const world = saved.world;
        if (!saved.paused && saved.savedAt) {
          const realHours = (Date.now() - saved.savedAt) / 3_600_000;
          advance(world, realHours * SIM_PER_REAL_HOUR);
        }
        warmWorld(world);
        set({ world, paused: Boolean(saved.paused), ready: true, frame: 1 });
        persist(world, Boolean(saved.paused));
        return;
      }
    } catch {
      /* fresh desk */
    }
    set({ world: blankWorld(), ready: true, frame: 1 });
    window.setTimeout(() => {
      const world = get().world;
      if (world.jobs.length > 0) return;
      warmWorld(world);
      set({ frame: get().frame + 1 });
    }, 40);
  },
  togglePause: () => {
    const paused = !get().paused;
    set({ paused, frame: get().frame + 1 });
    persist(get().world, paused);
  },
  tick: (realSeconds) => {
    const { paused, world, ready } = get();
    if (!ready || paused || realSeconds <= 0) return;
    advance(world, (realSeconds / 3600) * SIM_PER_REAL_HOUR);
    set({ frame: get().frame + 1 });
    persist(world, false, false);
  },
  found: (name, zip) => {
    const error = foundCompany(get().world, name, zip);
    if (error) return error;
    set({ frame: get().frame + 1, paused: false });
    persist(get().world, false);
    return null;
  },
  holdJob: (id) => {
    get().world.heldJobId = id;
    set({ frame: get().frame + 1 });
  },
  accept: (jobId, vehicleId, driverId, trailerId, force, stage) => {
    const error = acceptJob(get().world, jobId, vehicleId, driverId, trailerId, force, stage);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  cancel: (shipmentId) => {
    const error = cancelShipment(get().world, shipmentId);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  hireDriver: (id) => {
    const error = hire(get().world, id);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  fireDriver: (id) => {
    const error = fire(get().world, id);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  buyTruck: (listingId, warehouseId) => {
    const error = buyListing(get().world, listingId, warehouseId);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  sellTruck: (id) => {
    const error = sellVehicle(get().world, id);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  repair: (id) => {
    const error = repairVehicle(get().world, id);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  buyWarehouse: (id) => {
    const error = buyYard(get().world, id);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  sellWarehouse: (id) => {
    const error = sellYard(get().world, id);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  sendTruck: (vehicleId, zip, driverId) => {
    const error = reposition(get().world, vehicleId, zip, driverId);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  divert: (shipmentId, warehouseId) => {
    const error = divertToYard(get().world, shipmentId, warehouseId);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  rollStored: (shipmentId, vehicleId, driverId, trailerId) => {
    const error = resumeStored(get().world, shipmentId, vehicleId, driverId, trailerId);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  dispatch: (warehouseId, vehicleId, driverId, shipmentIds, trailerId, atDawn) => {
    const error = dispatchLoop(get().world, warehouseId, vehicleId, driverId, shipmentIds, trailerId, atDawn);
    set({ frame: get().frame + 1 });
    persist(get().world, get().paused);
    return error;
  },
  restart: (name, zip) => {
    const world = get().world;
    world.company = null;
    const error = foundCompany(world, name, zip);
    if (error) return error;
    set({ frame: get().frame + 1, paused: false });
    persist(world, false);
    return null;
  },
  abandon: () => {
    const world = get().world;
    world.company = null;
    world.heldJobId = null;
    set({ frame: get().frame + 1, paused: true });
    persist(world, true);
  },
  exportSave: () => JSON.stringify({ world: get().world, paused: get().paused }),
  importSave: (raw) => {
    try {
      const saved = JSON.parse(raw) as { world: World; paused?: boolean };
      if (!saved.world || typeof saved.world.simHours !== "number") return "That file is not a Practical Miles save.";
      set({ world: saved.world, paused: Boolean(saved.paused), frame: get().frame + 1 });
      persist(saved.world, Boolean(saved.paused));
      return null;
    } catch {
      return "Could not read that save.";
    }
  },
}));
