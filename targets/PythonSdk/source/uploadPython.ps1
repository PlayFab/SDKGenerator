Param(
    [switch]$prod= $false
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
        twine upload dist/*;
    }
}
