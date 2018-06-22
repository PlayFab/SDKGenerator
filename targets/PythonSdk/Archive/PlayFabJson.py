def serialize_instance(obj):
    d = { '__classname__' : type(obj).__name__ }
    d.update(vars(obj))
    return d

classes = {
# may need to make this file generic?
}

def unserialize_object(d):
    # TODO: investigate classname element more carefully
    clsname = d.pop('__classname__', None)
    if clsname:
        cls = classes[clsname]
        obj = cls.__new__(cls)  # make instance without calling __init__
        obj.update(d)
        return obj
    else:
        return d
