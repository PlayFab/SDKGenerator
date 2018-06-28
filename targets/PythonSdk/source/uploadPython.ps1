cd F:\sdks\PythonSDK\

python setup.py sdist bdist_wheel

twine upload --repository-url https://test.pypi.org/legacy/ dist/*

python -m pip uninstall PlayFab

python -m pip install --trusted-host test.pypi.org --upgrade --index-url https://test.pypi.org/simple/ PlayFab

cd ..\..\pyTest\

python
