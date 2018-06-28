import setuptools
with open("README.md", "r") as fh:
        long_description = fh.read()
        
setuptools.setup(
    name="playfab",
    version="0.0.2",
    author="PlayFab Dev Tools team",
    author_email="playfabdt@microsoft.com",
    description="PlayFab SDK for Python",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/PlayFab/PythonSdk",
    packages=setuptools.find_packages(),
    classifiers=(
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
    ),
)