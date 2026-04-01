from sqlalchemy import Column, Integer, Text
from .database import Base


class Birth(Base):
    __tablename__ = "births"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, index=True)
    surname = Column(Text, index=True)
    date_of_birth = Column(Text)
    place_of_birth = Column(Text)
    contributor = Column(Text, index=True)
    link = Column(Text)


class Family(Base):
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    husband_name = Column(Text, index=True)
    husband_surname = Column(Text, index=True)
    wife_name = Column(Text, index=True)
    wife_surname = Column(Text, index=True)
    children = Column(Text)
    date_of_marriage = Column(Text)
    place_of_marriage = Column(Text)
    contributor = Column(Text, index=True)
    link = Column(Text)


class Death(Base):
    __tablename__ = "deaths"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, index=True)
    surname = Column(Text, index=True)
    date_of_death = Column(Text)
    place_of_death = Column(Text)
    contributor = Column(Text, index=True)
    link = Column(Text)


class Contributor(Base):
    __tablename__ = "contributors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(Text, unique=True, index=True)
    last_modified = Column(Text)
