#pragma once

#include "Json.h"
#include "UnrealString.h"

namespace PlayFab
{

    typedef TSharedRef< TJsonWriter<TCHAR, TPrettyJsonPrintPolicy<TCHAR> > > JsonWriter;
    typedef TSharedRef< TJsonReader<TCHAR> > JsonReader;

    template <typename BoxedType>
    class Boxed
    {
    public:
        BoxedType mValue;

        Boxed() : mValue(), mIsSet(false) {}
        Boxed(BoxedType value) : mValue(value), mIsSet(true) {}

        Boxed& operator=(BoxedType value) { mValue = value; mIsSet = true; return *this; }
        operator BoxedType() { return mValue; }
        operator BoxedType() const { return mValue; }

        void setNull() { mIsSet = false; }
        bool notNull() { return mIsSet; }
        bool notNull() const { return mIsSet; }
        bool isNull() { return !mIsSet; }
        bool isNull() const { return !mIsSet; }
    private:
        bool mIsSet;
    };

    typedef Boxed<bool> OptionalBool;
    typedef Boxed<uint16> OptionalUint16;
    typedef Boxed<int16> OptionalInt16;
    typedef Boxed<uint32> OptionalUint32;
    typedef Boxed<int32> OptionalInt32;
    typedef Boxed<uint64> OptionalUint64;
    typedef Boxed<int64> OptionalInt64;
    typedef Boxed<float> OptionalFloat;
    typedef Boxed<double> OptionalDouble;
    typedef Boxed<FDateTime> OptionalTime;

    struct FPlayFabBaseModel
    {
        virtual ~FPlayFabBaseModel() {}
        virtual void writeJSON(JsonWriter& Json) const = 0;
        virtual bool readFromValue(const TSharedPtr<FJsonObject>& obj) = 0;
        virtual bool readFromValue(const TSharedPtr<FJsonValue>& value) { return false; };

        FString toJSONString() const;
    };

    enum MultitypeVarTypes
    {
        MultitypeNull,
        MultitypeBool,
        MultitypeNumber,
        MultitypeString
    };

    struct FMultitypeVar : public FPlayFabBaseModel
    {
    private:
        MultitypeVarTypes mType;
        FString mString;
        bool mBool;
        double mNumber;

    public:

        FMultitypeVar() : mType(MultitypeNull) {}
        FMultitypeVar(bool val) : mType(MultitypeBool), mBool(val) {}
        FMultitypeVar(uint16 val) : mType(MultitypeNumber), mNumber(val) {}
        FMultitypeVar(int16 val) : mType(MultitypeNumber), mNumber(val) {}
        FMultitypeVar(uint32 val) : mType(MultitypeNumber), mNumber(val) {}
        FMultitypeVar(int32 val) : mType(MultitypeNumber), mNumber(val) {}
        FMultitypeVar(float val) : mType(MultitypeNumber), mNumber(val) {}
        FMultitypeVar(double val) : mType(MultitypeNumber), mNumber(val) {}
        FMultitypeVar(FString val) : mType(MultitypeString), mString(val) {}

        FMultitypeVar(const TSharedPtr<FJsonObject>& obj)
        {
            readFromValue(obj);
        }

        void setNull() { mType = MultitypeNull; }
        bool notNull() { return mType != MultitypeNull; }
        bool isNull() { return mType == MultitypeNull; }
        MultitypeVarTypes getType() { return mType; }

        bool notNull() const { return mType != MultitypeNull; }
        bool isNull() const { return mType == MultitypeNull; }
        MultitypeVarTypes getType() const { return mType; }

        FMultitypeVar& operator=(bool val) { mBool = val; mType = MultitypeBool; return *this; }
        FMultitypeVar& operator=(uint16 val) { mNumber = val; mType = MultitypeNumber; return *this; }
        FMultitypeVar& operator=(int16 val) { mNumber = val; mType = MultitypeNumber; return *this; }
        FMultitypeVar& operator=(uint32 val) { mNumber = val; mType = MultitypeNumber; return *this; }
        FMultitypeVar& operator=(int32 val) { mNumber = val; mType = MultitypeNumber; return *this; }
        FMultitypeVar& operator=(float val) { mNumber = val; mType = MultitypeNumber; return *this; }
        FMultitypeVar& operator=(double val) { mNumber = val; mType = MultitypeNumber; return *this; }
        FMultitypeVar& operator=(FString val) { mString = val; mType = MultitypeString; return *this; }

        operator bool() { return mBool; }
        operator uint16() { return (uint16)mNumber; }
        operator int16() { return (int16)mNumber; }
        operator uint32() { return (uint32)mNumber; }
        operator int32() { return (int32)mNumber; }
        operator float() { return (float)mNumber; }
        operator double() { return mNumber; }
        operator FString() { return mString; }

        operator bool() const { return mBool; }
        operator uint16() const { return (uint16)mNumber; }
        operator int16() const { return (int16)mNumber; }
        operator uint32() const { return (uint32)mNumber; }
        operator int32() const { return (int32)mNumber; }
        operator float() const { return (float)mNumber; }
        operator double() const { return mNumber; }
        operator FString() const { return mString; }


        ~FMultitypeVar() {}
        void writeJSON(JsonWriter& writer) const override;
        bool readFromValue(const TSharedPtr<FJsonObject>& obj) override;
        bool readFromValue(const TSharedPtr<FJsonValue>& value) override;
    };


    void writeDatetime(FDateTime datetime, JsonWriter& writer);
    FDateTime readDatetime(const TSharedPtr<FJsonValue>& value);

}
