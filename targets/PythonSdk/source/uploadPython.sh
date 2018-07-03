echo ===== BEGAN SECOND SCRIPT =====

cd sdks/$SdkName/

python -m pip install --user --upgrade setuptools wheel

python -m pip install --user --upgrade twine

python setup.py sdist bdist_wheel

twine upload dist/* -u playfabDevTools -p $PYTHON_API_HASH || exit 0

exit 0
