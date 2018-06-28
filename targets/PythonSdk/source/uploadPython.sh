#!/bin/bash

# cd F:/sdks/PythonSDK/
cd /mnt/f/sdks/PythonSDK/

python setup.py sdist bdist_wheel

if [ -p "$1" ]
then
    twine upload dist/*
    exit 1
fi
    # last test version was 0.2.8 any earlier version uploaded will probably get stomped over by pypi's cache
    twine upload --repository-url https://test.pypi.org/legacy/ dist/*

    python -m pip uninstall playfab

    python -m pip install --trusted-host test.pypi.org --upgrade --index-url https://test.pypi.org/simple/ playfab

    cd ../../pyTest/

    python

    exit 1
