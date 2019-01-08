// Copyright (c) Microsoft. All rights reserved.

#pragma once

namespace ARIASDK_NS_BEGIN {


class BondSerializer {
  protected:
    bool handleSerialize(IncomingEventContextPtr const& ctx);

  public:
    RoutePassThrough<BondSerializer, IncomingEventContextPtr const&> serialize{this, &BondSerializer::handleSerialize};
};


} ARIASDK_NS_END
