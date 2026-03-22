import React, { createContext, useContext, useState, ReactNode } from "react";
import type { FuelType } from "@/lib/api";
import { setFuelTypeCookie } from "./cookies";

interface FuelTypeContextType {
  fuelType: FuelType;
  setFuelType: (fuelType: FuelType) => void;
}

const FuelTypeContext = createContext<FuelTypeContextType | undefined>(
  undefined,
);

interface FuelTypeProviderProps {
  children: ReactNode;
  initialFuelType?: FuelType;
}

export function FuelTypeProvider({
  children,
  initialFuelType = "e5",
}: FuelTypeProviderProps) {
  const [fuelType, setFuelTypeState] = useState<FuelType>(initialFuelType);

  const setFuelType = (newFuelType: FuelType) => {
    setFuelTypeState(newFuelType);
    setFuelTypeCookie(newFuelType);
  };

  return (
    <FuelTypeContext.Provider value={{ fuelType, setFuelType }}>
      {children}
    </FuelTypeContext.Provider>
  );
}

export function useFuelType(): FuelTypeContextType {
  const context = useContext(FuelTypeContext);
  if (!context) {
    throw new Error("useFuelType must be used within a FuelTypeProvider");
  }
  return context;
}
