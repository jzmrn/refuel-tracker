"""
Tankerkoenig API client for fetching gas station prices and data.
"""

from enum import Enum
from pydantic import BaseModel, Field
from typing import Annotated, Literal
from pydantic import TypeAdapter


class FuelType(str, Enum):
    E5 = "e5"
    E10 = "e10"
    DIESEL = "diesel"
    ALL = "all"


class SortBy(str, Enum):
    PRICE = "price"
    DIST = "dist"


class TankerKoenigError(BaseModel):
    ok: Literal[False]
    message: str


class GasStationOpen(BaseModel):
    status: Literal["open"]
    e5: float | bool
    e10: float | bool
    diesel: float | bool


class GasStationClosed(BaseModel):
    status: Literal["closed"]


class GasStationNoPrices(BaseModel):
    status: Literal["no prices"]


class GasStationNoStations(BaseModel):
    status: Literal["no stations"]


GasStationData = Annotated[
    GasStationOpen | GasStationClosed | GasStationNoPrices | GasStationNoStations,
    Field(discriminator="status"),
]


class TankerKoenigPriceData(BaseModel):
    ok: Literal[True]
    license: str
    data: str
    prices: dict[str, GasStationData]


PriceResponse = Annotated[
    TankerKoenigPriceData | TankerKoenigError,
    Field(discriminator="ok"),
]

PriceResponseAdapter: TypeAdapter[PriceResponse] = TypeAdapter(PriceResponse)


class GasStationInfo(BaseModel):
    """Represents a gas station with location."""

    id: str
    name: str
    brand: str
    street: str
    place: str
    lat: float
    lng: float
    isOpen: bool
    houseNumber: str
    postCode: int


class GasStationOnePrice(GasStationInfo):
    """Represents a gas station price information."""

    dist: float
    price: float


class GasStationAllPrices(GasStationInfo):
    """Represents a gas station price information."""

    dist: float
    e5: float | None = None
    e10: float | None = None
    diesel: float | None = None


class TankerKoenigSearchData(BaseModel):
    """Success response for gas station search."""

    ok: Literal[True]
    license: str
    data: str
    status: str
    stations: list[GasStationOnePrice] | list[GasStationAllPrices]


SearchResponse = Annotated[
    TankerKoenigSearchData | TankerKoenigError,
    Field(discriminator="ok"),
]

SearchResponseAdapter: TypeAdapter[SearchResponse] = TypeAdapter(SearchResponse)


class OpeningTime(BaseModel):
    """Represents opening hours for a gas station."""

    text: str
    start: str
    end: str


class GasStationDetail(GasStationInfo):
    """Represents detailed information about a gas station."""

    openingTimes: list[OpeningTime]
    overrides: list[str]
    wholeDay: bool
    e5: float | None = None
    e10: float | None = None
    diesel: float | None = None
    lat: float
    lng: float
    state: str | None = None


class TankerKoenigDetailData(BaseModel):
    """Success response for gas station detail."""

    ok: Literal[True]
    license: str
    data: str
    status: str
    station: GasStationDetail


DetailResponse = Annotated[
    TankerKoenigDetailData | TankerKoenigError,
    Field(discriminator="ok"),
]

DetailResponseAdapter: TypeAdapter[DetailResponse] = TypeAdapter(DetailResponse)


class GasStationPrice(BaseModel):
    """Represents the price information for a gas station."""

    station_id: str
    status: str
    e5: float | None = None
    e10: float | None = None
    diesel: float | None = None

    @classmethod
    def from_gas_station_data(cls, station_id: str, data: GasStationData):
        """Create GasStationPrice from GasStationData."""

        if isinstance(data, GasStationOpen):
            e5 = data.e5 if data.e5 is not False else None
            e10 = data.e10 if data.e10 is not False else None
            diesel = data.diesel if data.diesel is not False else None
        else:
            e5 = e10 = diesel = None

        return cls(
            station_id=station_id,
            status=data.status,
            e5=e5,
            e10=e10,
            diesel=diesel,
        )
