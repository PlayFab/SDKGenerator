Param(
    [switch]$prod= $false # this should be called sdks/PythonSdk/uploadPython.ps1 -prod -PYTHON_API_HASH {insert password here through the correct channels}
    [string]$PYTHON_API_HASH = "" # default to a null string, if you don't have our password, you shouldn't be able to upload a malicious python package
)

# TODO: this file should be converted to a .sh to be consistent with Jenkins builds.
cd F:\sdks\PythonSDK\

python setup.py sdist bdist_wheel

switch($prod)
{
    $false{
        # last test version was 0.2.8 any earlier version uploaded will probably get stomped over by pypi's cache
        twine upload --repository-url https://test.pypi.org/legacy/ dist/*;

        python -m pip uninstall playfab;

        python -m pip install --trusted-host test.pypi.org --upgrade --index-url https://test.pypi.org/simple/ playfab;

        cd ..\..\pyTest\;

        python;
    }
    $true{
        twine upload dist/* -u playfabDevTools -p $PYTHON_API_HASH
    }
}
