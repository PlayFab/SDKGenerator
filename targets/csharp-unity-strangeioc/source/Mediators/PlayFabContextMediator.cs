using UnityEngine;
using System.Collections;
using strange.extensions.context.impl;

public class PlayFabContextMediator : ContextView {

    public void Awake()
    {
        context = new PlayFabContext(this,true);
        context.Start();
    }
}
