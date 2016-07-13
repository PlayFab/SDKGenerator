
#include "StdAfx.h"

#include <gtest/gtest.h>

class PlayFabSdkTest : public ::testing::Test
{
protected:
    void SetUp() override
    {

    }

    void TearDown() override
    {

    }
};

TEST_F(PlayFabSdkTest, ExampleTest)
{
    ASSERT_TRUE(true);
}

GEM_IMPLEMENT_TEST_RUNNER
