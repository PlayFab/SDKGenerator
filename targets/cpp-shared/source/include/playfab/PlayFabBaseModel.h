#ifndef PLAYFAB_BASE_MODEL_H_
#define PLAYFAB_BASE_MODEL_H_

#include <string>
#include <list>
#include <map>

#include "json/document.h"
#include "json/writer.h"
#include "json/encodings.h"
#include "json/stringbuffer.h"


namespace PlayFab
{
    typedef rapidjson::Writer< rapidjson::GenericStringBuffer< rapidjson::UTF8<> > > PFStringJsonWriter;

#ifdef WIN32
    typedef signed __int64 Int64;
    typedef signed __int32 Int32;
    typedef signed __int16 Int16;

    typedef unsigned __int64 Uint64;
    typedef unsigned __int32 Uint32;
    typedef unsigned __int16 Uint16;
#else
    typedef int64_t Int64;
    typedef int32_t Int32;
    typedef int16_t Int16;

    typedef uint64_t Uint64;
    typedef uint32_t Uint32;
    typedef uint16_t Uint16;
#endif

    template <typename BoxedType>
    class Boxed
    {
    public:
        BoxedType mValue;

        Boxed() : mValue(), mIsSet(false) {}
        Boxed(BoxedType value) : mValue(value), mIsSet(true) {}

        Boxed& operator=(BoxedType value) { mValue = value; mIsSet = true; return *this; }
        operator BoxedType() { return mValue; }

        void setNull() { mIsSet = false; }
        bool notNull() const { return mIsSet; }
        bool isNull() const { return !mIsSet; }
    private:
        bool mIsSet;
    };

    typedef Boxed<bool> OptionalBool;
    typedef Boxed<Uint16> OptionalUint16;
    typedef Boxed<Int16> OptionalInt16;
    typedef Boxed<Uint32> OptionalUint32;
    typedef Boxed<Int32> OptionalInt32;
    typedef Boxed<Uint64> OptionalUint64;
    typedef Boxed<Int64> OptionalInt64;
    typedef Boxed<float> OptionalFloat;
    typedef Boxed<double> OptionalDouble;
    typedef Boxed<time_t> OptionalTime;

    struct PlayFabBaseModel
    {
        virtual ~PlayFabBaseModel() {}
        virtual void writeJSON(PFStringJsonWriter& writer) = 0;
        virtual bool readFromValue(const rapidjson::Value& obj) = 0;

        std::string toJSONString();
    };

    enum MultitypeVarTypes
    {
        MultitypeNull,
        MultitypeBool,
        MultitypeNumber,
        MultitypeString
    };

    struct MultitypeVar : public PlayFabBaseModel
    {
    private:
        MultitypeVarTypes mType;
        std::string mString;
        bool mBool;
        double mNumber;

    public:

        MultitypeVar() : mType(MultitypeNull), mString(), mBool(), mNumber() {}
        MultitypeVar(bool val) : mType(MultitypeBool), mString(), mBool(val), mNumber() {}
        MultitypeVar(Uint16 val) : mType(MultitypeNumber), mString(), mBool(), mNumber(val) {}
        MultitypeVar(Int16 val) : mType(MultitypeNumber), mString(), mBool(), mNumber(val) {}
        MultitypeVar(Uint32 val) : mType(MultitypeNumber), mString(), mBool(), mNumber(val) {}
        MultitypeVar(Int32 val) : mType(MultitypeNumber), mString(), mBool(), mNumber(val) {}
        MultitypeVar(float val) : mType(MultitypeNumber), mString(), mBool(), mNumber(val) {}
        MultitypeVar(double val) : mType(MultitypeNumber), mString(), mBool(), mNumber(val) {}
        MultitypeVar(std::string val) : mType(MultitypeString), mString(val), mBool(), mNumber() {}

        MultitypeVar(const rapidjson::Value& obj)
        {
            readFromValue(obj);
        }

        void setNull() { mType = MultitypeNull; }
        bool notNull() const { return mType != MultitypeNull; }
        bool isNull() const { return mType == MultitypeNull; }
        MultitypeVarTypes getType() const { return mType; }

        MultitypeVar& operator=(bool val) { mBool = val; mType = MultitypeBool; return *this; }
        MultitypeVar& operator=(Uint16 val) { mNumber = val; mType = MultitypeNumber; return *this; }
        MultitypeVar& operator=(Int16 val) { mNumber = val; mType = MultitypeNumber; return *this; }
        MultitypeVar& operator=(Uint32 val) { mNumber = val; mType = MultitypeNumber; return *this; }
        MultitypeVar& operator=(Int32 val) { mNumber = val; mType = MultitypeNumber; return *this; }
        MultitypeVar& operator=(float val) { mNumber = val; mType = MultitypeNumber; return *this; }
        MultitypeVar& operator=(double val) { mNumber = val; mType = MultitypeNumber; return *this; }
        MultitypeVar& operator=(std::string val) { mString = val; mType = MultitypeString; return *this; }

        operator bool() const { return mBool; }
        operator Uint16() const { return (Uint16)mNumber; }
        operator Int16() const { return (Int16)mNumber; }
        operator Uint32() const { return (Uint32)mNumber; }
        operator Int32() const { return (Int32)mNumber; }
        operator float() const { return (float)mNumber; }
        operator double() const { return mNumber; }
        operator std::string() const { return mString; }

        ~MultitypeVar() {}
        void writeJSON(PFStringJsonWriter& writer) override;
        bool readFromValue(const rapidjson::Value& obj) override;
    };

    void writeDatetime(time_t datetime, PFStringJsonWriter& writer);
    time_t readDatetime(const rapidjson::Value& obj);
}

#endif
