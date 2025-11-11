export type Language = "en" | "de";

export interface TranslationStructure {
  // Common UI elements
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    confirm: string;
    close: string;
    search: string;
    filter: string;
    clear: string;
    back: string;
    next: string;
    previous: string;
    settings: string;
    language: string;
    noData: string;
    error: string;
    success: string;
    warning: string;
    total: string;
    spans: string;
    unknownError: string;
  };

  // Navigation
  navigation: {
    dashboard: string;
    refuel: string;
    dataTracking: string;
    timeSpans: string;
    home: string;
    fuel: string;
    data: string;
    time: string;
  };

  // Layout
  layout: {
    appTitle: string;
  };

  // Data tracking
  dataTracking: {
    title: string;
    addDataPoint: string;
    statistics: string;
    statisticsFor: string;
    noDataPoints: string;
    addDataPointsToSeeStats: string;
    loadingStatistics: string;
    valuesOverTime: string;
    hoverForDetails: string;
    value: string;
    notes: string;
    label: string;
    timestamp: string;
    loadingDataPoints: string;
    noDataPointsYet: string;
    startTracking: string;
    entry: string;
    entries: string;
    latest: string;
    deleteDataPoint: string;
    uniqueLabels: string;
    selectMetricToView: string;
    selectMetricToViewStats: string;
    noMetricsAvailable: string;
    filterByMetric: string;
    allMetrics: string;
    trackNumericalData: string;
    labels: string;
    noDataPointsYetMobile: string;
    addFirstDataPoint: string;
    dataPointDeleteConfirm: string;
    actionCannotBeUndone: string;
    dataPointAdded: string;
    dataPointDeleted: string;
    failedToLoadData: string;
    failedToAddDataPoint: string;
    failedToDeleteDataPoint: string;

    // Statistics
    average: string;
    median: string;
    range: string;
    totalEntries: string;
    maximum: string;
    minimum: string;
    stdDeviation: string;
    trend: string;
    stable: string;
    increasing: string;
    decreasing: string;
  };

  // Refuels
  refuels: {
    title: string;
    addRefuel: string;
    consumption: string;
    price: string;
    statistics: string;
    amount: string;
    totalCost: string;
    pricePerLiter: string;
    odometer: string;
    date: string;
    refuelTracking: string;
    manageFuelData: string;
    addEntry: string;
    allEntries: string;
    filter: string;
    showAll: string;
    thisMonth: string;
    thisYear: string;
    refuelAddedSuccess: string;
    errorAddingRefuel: string;
    errorLoadingData: string;
    errorFiltering: string;

    // Form labels and validation
    dateTime: string;
    now: string;
    pricePerLiterForm: string;
    amountLiters: string;
    kilometersSinceLastRefuel: string;
    estimatedFuelConsumption: string;
    notes: string;
    optional: string;
    cancel: string;

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
    currentPrice: string;
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
    loadingData: string;
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
    accuracyDescription: string;
    greenLineSolid: string;
    blueLineDashed: string;
    actualConsumptionDescription: string;
    yourEstimates: string;

    // Placeholders
    placeholders: {
      notes: string;
    };
  };

  // Time spans
  timeSpans: {
    title: string;
    addTimeSpan: string;
    editTimeSpan: string;
    updateTimeSpan: string;
    statistics: string;
    name: string;
    startDate: string;
    endDate: string;
    duration: string;
    trackActivities: string;
    uniqueLabels: string;
    totalEntries: string;
    labels: string;
    entries: string;
    filterByGroup: string;
    allGroups: string;
    searchTimeSpans: string;
    allTimeSpans: string;
    noTimeSpansYet: string;
    addFirstTimeSpan: string;
    deleteTimeSpan: string;
    deleteConfirmMessage: string;
    addedSuccessfully: string;
    updatedSuccessfully: string;
    deletedSuccessfully: string;
    failedToAdd: string;
    failedToUpdate: string;
    failedToDelete: string;
    failedToLoad: string;
    allValues: string;
    startDateTime: string;
    endDateTime: string;
    now: string;
    labelActivity: string;
    group: string;
    notesOptional: string;
    ongoingActivity: string;
    labelRequired: string;
    labelTooLong: string;
    invalidStartDate: string;
    invalidEndDate: string;
    endBeforeStart: string;
    notesTooLong: string;
    groupRequired: string;
    groupTooLong: string;
    startDateRequired: string;
    leaveEmptyOngoing: string;
    clickForSuggestions: string;
    clickForGroupSuggestions: string;
    charactersUsed: string;
    loadingTimeSpans: string;
    startTracking: string;
    span: string;
    spans: string;
    total: string;
    started: string;
    ended: string;
    andCounting: string;
    editTimeSpanTitle: string;
    deleteTitle: string;
    ongoing: string;
    general: string;
    placeholders: {
      labelActivity: string;
      group: string;
      notes: string;
    };
    // Statistics
    statisticsFor: string;
    noStatisticsData: string;
    addSomeTimeSpans: string;
    selectGroupTimeline: string;
    statisticsShowAllSpans: string;
    timelineShows: string;
    timelineShowsGroup: string;
    groupOnly: string;
    avgDuration: string;
    totalTime: string;
    longest: string;
    shortest: string;
    median: string;
    completed: string;
    totalSpansCount: string;
    completedSpans: string;
    ongoingSpans: string;
    activeIndicator: string;
    chartHelpRow: string;
    chartHelpHover: string;
    chartHelpAxes: string;
    chartHelpGreen: string;
    timelineSwimlanes: string;
    noTimelineData: string;
    noTimeSpansForGroup: string;
    switchTo: string;
    currentOngoingActivities: string;
    runningFor: string;
    timelineFor: string;
  };

  // Transactions
  transactions: {
    title: string;
    addTransaction: string;
    amount: string;
    description: string;
    category: string;
    date: string;
    income: string;
    expenses: string;
    net: string;
    transactions: string;
    type: string;
    account: string;
    expense: string;
    transfer: string;
    descriptionOptional: string;
    adding: string;
    failedToAdd: string;
    failedToFetch: string;
    recentTransactions: string;
    noTransactions: string;
    tryAgain: string;
    placeholders: {
      account: string;
      category: string;
      description: string;
    };
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

  // Dashboard
  dashboard: {
    welcome: string;
    recentActivity: string;
    quickStats: string;
  };
}
