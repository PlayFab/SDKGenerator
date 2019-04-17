﻿#if !NET_4_6 && (NET_2_0_SUBSET || NET_2_0)

//
//  GenericEqualityComparer.cs
//
//  Author:
//      Jim Borden  <jim.borden@couchbase.com>
//
//  Copyright (c) 2015 Couchbase, Inc All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//  http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//
using System;
using System.Collections.Generic;

namespace System.Collections.Generic.Couchbase
{
    //This class is needed for Unity iOS compatibility
    [Serializable]
    public sealed class GenericEqualityComparer <T> : IEqualityComparer, IEqualityComparer <T> where T : IEquatable <T> {

        public int GetHashCode (T obj)
        {
            if (obj == null)
                return 0;

            return obj.GetHashCode ();
        }

        public bool Equals (T x, T y)
        {
            if (x == null)
                return y == null;

            return x.Equals (y);
        }

        public int GetHashCode(object obj)
        {
            if (obj == null)
                return 0;

            if (!(obj is T))
                throw new ArgumentException ("Argument is not compatible", "obj");

            return GetHashCode ((T)obj);
        }

		// warning CS0108: Hides inheritet member object.Equals(object, object).
#pragma warning disable 108,114
        public bool Equals(object x, object y)
#pragma warning restore 108,114
        {

            if(x == null || y == null) {
                return false;
            }

            if(!(x is T) || !(y is T)) {
                return false;
            }

            return Equals((T)x, (T)y);
        }
    }
}


#endif