export type Language = "en" | "de";

const LANGUAGES: ReadonlySet<string> = new Set<string>(["en", "de"]);

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && LANGUAGES.has(value);
}

export interface TranslationStructure {
  // Common UI elements
  common: {
    loading: string;
    save: string;
    saving: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    confirm: string;
    close: string;
    search: string;
    searching: string;
    filter: string;
    clear: string;
    back: string;
    next: string;
    previous: string;
    settings: string;
    language: string;
    noStatistics: string;
    error: string;
    success: string;
    warning: string;
    total: string;
    spans: string;
    unknownError: string;
    labels: string;
    entries: string;
    signOut: string;
    name: string;
    actions: string;
    all: string;
    notes: string;
    statistics: string;
    errorLoadingData: string;
  };

  // Navigation
  navigation: {
    dashboard: string;
    cars: string;
    fuelPrices: string;
    settings: string;
    home: string;
    more: string;
    prices: string;
    addEntry: string;
    showAll: string;
    thisMonth: string;
    thisYear: string;
    lastMonth: string;
    lastSixMonths: string;
    lastYear: string;
    statistics: string;
  };

  // Layout
  layout: {
    appTitle: string;
  };

  // Refuels
  refuels: {
    title: string;
    addRefuel: string;
    consumption: string;
    amount: string;
    totalCost: string;
    pricePerLiter: string;
    odometer: string;
    date: string;
    errorAddingRefuel: string;
    errorLoadingData: string;

    // Form labels and validation
    pricePerLiterForm: string;
    amountLiters: string;
    kilometersSinceLastRefuel: string;
    estimatedFuelConsumption: string;
    optional: string;
    station: string;
    gasStation: string;
    selectStation: string;
    favoriteStationsCanBeSelected: string;
    here: string;

    // Validation messages
    priceMinRequired: string;
    priceMaxExceeded: string;
    amountMinRequired: string;
    amountMaxExceeded: string;
    kilometersRequired: string;
    fuelConsumptionRequired: string;
    fuelConsumptionMaxExceeded: string;
    invalidDateFormat: string;
    dateCannotBeFuture: string;
    dateTimeRequired: string;
    notesMaxLength: string;
    charactersCount: string;

    // Chart and calculations
    priceTrendsOverTime: string;
    noPriceTrendData: string;
    addMoreRefuelEntries: string;
    priceLabel: string;
    pricePerLiterChart: string;
    lowestPrice: string;
    highestPrice: string;
    priceRange: string;
    totalCostCalc: string;
    actualConsumption: string;
    vsEstimated: string;

    // Tooltip labels
    pricePerLiterTooltip: string;
    amountTooltip: string;
    totalCostTooltip: string;

    // RefuelList labels
    refuelEntries: string;
    recentRefuels: string;
    viewStatistics: string;
    noRefuelEntriesYet: string;
    addFirstRefuelEntry: string;
    today: string;
    dateHeader: string;
    litersHeader: string;
    totalHeader: string;
    kmHeader: string;
    notesHeader: string;

    // RefuelConsumptionChart labels
    fuelConsumptionEstimatedVsActual: string;
    noConsumptionDataAvailable: string;
    addMoreRefuelEntriesToSeeConsumptionTrends: string;
    noValidConsumptionDataAvailable: string;
    makeSureEntriesHaveKilometersAndFuelAmount: string;
    consumptionLabelWithUnit: string;
    estimated: string;
    actual: string;
    estimatedConsumption: string;
    actualConsumptionChart: string;
    difference: string;
    distance: string;
    fuel: string;
    avgActual: string;
    avgEstimated: string;
    avgDifference: string;
    accuracy: string;

    // RefuelDistanceChart labels
    distanceSinceLastRefuel: string;
    noDistanceDataAvailable: string;
    addMoreRefuelEntriesToSeeDistanceTrends: string;
    noValidDistanceDataAvailable: string;
    makeSureEntriesHaveKilometersData: string;
    distanceKm: string;
    minDistance: string;
    maxDistance: string;
    avgDistance: string;
    avgTankUsage: string;

    // Placeholders
    placeholders: {
      notes: string;
    };
  };

  // Kilometers
  kilometers: {
    title: string;
    addKilometer: string;
    totalKilometers: string;
    recentEntries: string;
    kilometerHistory: string;
    noEntriesYet: string;
    addFirstEntry: string;
    entryAdded: string;
    entryDeleted: string;
    errorAddingEntry: string;
    errorDeletingEntry: string;
    errorLoadingData: string;
    viewChart: string;
    totalKilometersForm: string;
    kilometersRequired: string;
    kilometersPositive: string;
    invalidDateFormat: string;
    dateCannotBeFuture: string;
    dateTimeRequired: string;
    lastMonth: string;
    lastSixMonths: string;
    kilometersPerYear: string;
    kilometersPerMonth: string;
    kilometersDriven: string;
    noAggregateData: string;
  };

  // Forms
  forms: {
    required: string;
    invalidFormat: string;
    mustBePositive: string;
    mustBeGreaterThanZero: string;
    pleaseSelectLabel: string;
    addNotes: string;
    dateTime: string;
    numericalValue: string;
    labelTopic: string;
    notesOptional: string;
    now: string;
    valueMustBeNumber: string;
    labelRequired: string;
    labelTooLong: string;
    invalidDateFormat: string;
    dateCannotBeFuture: string;
    dateTimeRequired: string;
    notesTooLong: string;
    clickForSuggestions: string;
    charactersUsed: string;
    placeholders: {
      value: string;
      label: string;
      notes: string;
    };
  };

  // Settings
  settings: {
    title: string;
    description: string;
    language: {
      title: string;
      description: string;
    };
    theme: {
      title: string;
      description: string;
      light: string;
      dark: string;
      system: string;
    };
  };

  // Dashboard
  dashboard: {
    welcome: string;
    recentActivity: string;
    quickStats: string;
    gettingStartedTitle: string;
    gettingStartedDescription: string;
    features: {
      refuelDescription: string;
      fuelPricesDescription: string;
      statisticsDescription: string;
    };
  };

  // Cars
  cars: {
    title: string;
    description: string;
    addCar: string;
    sharedAccess: string;
    addNewCar: string;
    editCar: string;
    carName: string;
    year: string;
    fuelTankSize: string;
    fuelType: string;
    selectFuelType: string;
    owner: string;
    tankSize: string;
    saveChanges: string;
    updateCar: string;
    carDetails: string;
    addFirstCar: string;
    shareWith: string;
    searchUserPlaceholder: string;
    fillAllRequiredFields: string;
    failedToSearchUsers: string;
    myCars: string;
    sharedWithMe: string;
    sharedBy: string;
    deleteCarConfirm: string;
    carAddedSuccess: string;
    carUpdatedSuccess: string;
    carDeletedSuccess: string;
    accessRevokedSuccess: string;
    failedToLoadCars: string;
    failedToCreateCar: string;
    failedToUpdateCar: string;
    failedToDeleteCar: string;
    failedToShareCar: string;
    failedToRevokeAccess: string;
    carNamePlaceholder: string;
    makePlaceholder: string;
    modelPlaceholder: string;
    yearPlaceholder: string;
    licensePlatePlaceholder: string;
    shareWithUsers: string;
    searchUsers: string;
    searchByEmail: string;
    noUsersFound: string;
    noUsersSelected: string;
    typeAtLeastThreeChars: string;
    share: string;
    revoke: string;
    sharedWith: string;
    noSharedAccess: string;
    addSharedUsers: string;
    selectUsersToShare: string;
    addSelectedUsers: string;
    selectedUsers: string;
    removeAccess: string;
    carsSharedWithMe: string;
    noCarsSharedWithYou: string;
    carsIShared: string;
    noSharedCars: string;
    searchForUsers: string;
    selectCar: string;
    selectCarToView: string;
    noStatistics: string;
    addRefuelsToSeeStats: string;
    refuelCount: string;
    totalDistance: string;
    totalFuel: string;
    totalCost: string;
    avgConsumption: string;
    avgPricePerLiter: string;
    avgCostPerRefuel: string;
    refuels: string;
    km: string;
    liters: string;
    firstRefuel: string;
    lastRefuel: string;
    timeline: string;
    deleteCar: string;
    deleteCarTitle: string;
    deleteCarMessage: string;
  };

  // Fuel Prices
  fuelPrices: {
    title: string;
    searchStations: string;
    favorites: string;
    searchForStations: string;
    searchDescription: string;
    latitude: string;
    longitude: string;
    radius: string;
    fuelType: string;
    sortBy: string;
    search: string;
    useMyLocation: string;
    e5: string;
    e5Short: string;
    e10: string;
    e10Short: string;
    diesel: string;
    price: string;
    distance: string;
    searchResults: string;
    backToResults: string;
    noResults: string;
    searchForStationsNearby: string;
    addToFavorites: string;
    removeFromFavorites: string;
    open: string;
    closed: string;
    statusNotAvailable: string;
    myFavorites: string;
    noFavorites: string;
    addStationsToFavorites: string;
    currentPrices: string;
    stationAdded: string;
    stationRemoved: string;
    failedToSearch: string;
    failedToAddFavorite: string;
    failedToRemoveFavorite: string;
    failedToLoadFavorites: string;
    locationNotSupported: string;
    locationPermissionDenied: string;
    gettingLocation: string;
    kmAway: string;
    stationsOpen: string;
    lowestE5: string;
    lowestE10: string;
    lowestDiesel: string;
    avgE5: string;
    avgE10: string;
    avgDiesel: string;
    statisticsDescription: string;
    radiusKm: string;
    latitudeRequired: string;
    longitudeRequired: string;
    radiusRequired: string;
    invalidCoordinates: string;
    brand: string;
    address: string;
    currentPrice: string;
    showOpenOnly: string;
    priceNotAvailable: string;
    stationDetails: string;
    stationId: string;
    unknown: string;
    comingSoon: string;
    lastUpdated: string;
    noDataAvailable: string;
    additionalInformation: string;
    priceHistory: string;
    dailyStats: string;
    priceActivity: string;
    priceChanges: string;
    uniquePrices: string;
    timeRange1Day: string;
    timeRange1Week: string;
    timeRange1Month: string;
    copyAddress: string;
    addressCopied: string;
  };

  // Statistics
  statistics: {
    title: string;
    description: string;
    filters: string;
    month: string;
    selectFuelType: string;
    cheapestStations: string;
    cheapestPlaces: string;
    cheapestBrands: string;
    station: string;
    address: string;
    place: string;
    brand: string;
    averagePrice: string;
    postCode: string;
    numStations: string;
    noDataAvailable: string;
    noMonthsAvailable: string;
    placesDetails: string;
    placesDetailsDescription: string;
    timeRange: string;
    last3Months: string;
    lastYear: string;
    avgPriceByPlace: string;
    priceVarianceByPlace: string;
    priceActivityByPlace: string;
    brandsDetails: string;
    brandsDetailsDescription: string;
    avgPriceByBrand: string;
    priceVarianceByBrand: string;
    priceActivityByBrand: string;
    stationsDetails: string;
    stationsDetailsDescription: string;
    avgPriceByStation: string;
    priceVarianceByStation: string;
    priceActivityByStation: string;
    avgDailyPriceChanges: string;
    avgDailyUniquePrices: string;
    variance: string;
    back: string;
  };
}
