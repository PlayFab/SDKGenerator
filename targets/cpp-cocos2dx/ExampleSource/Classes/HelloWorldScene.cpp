#include "HelloWorldScene.h"
#include "PlayFabApiTest.h"

USING_NS_CC;

std::string HelloWorld::cmdLine;
cocos2d::Label* HelloWorld::testReportLabel;

Scene* HelloWorld::createScene()
{
    // 'scene' is an autorelease object
    auto scene = Scene::create();

    // 'layer' is an autorelease object
    auto layer = HelloWorld::create();

    // add layer as a child to scene
    scene->addChild(layer);

    // return the scene
    return scene;
}

// on "init" you need to initialize your instance
bool HelloWorld::init()
{
    //////////////////////////////
    // 1. super init first
    if (!Layer::init())
    {
        return false;
    }

    Size visibleSize = Director::getInstance()->getVisibleSize();
    Vec2 origin = Director::getInstance()->getVisibleOrigin();

    /////////////////////////////
    // 2. add a menu item with "X" image, which is clicked to quit the program
    //    you may modify it.

    // add a "close" icon to exit the progress. it's an autorelease object
    auto closeItem = MenuItemImage::create(
        "CloseNormal.png",
        "CloseSelected.png",
        CC_CALLBACK_1(HelloWorld::menuCloseCallback, this));

    closeItem->setPosition(Vec2(origin.x + visibleSize.width - closeItem->getContentSize().width / 2,
        origin.y + closeItem->getContentSize().height / 2));

    // create menu, it's an autorelease object
    auto menu = Menu::create(closeItem, NULL);
    menu->setPosition(Vec2::ZERO);
    this->addChild(menu, 1);
    this->scheduleUpdate();

    /////////////////////////////
    // 3. add your codes below...

    // Test suite setup
    PlayFabApiTest::PlayFabApiTests::InitializeTestSuite();

    // Test output setup
    testReportLabel = Label::createWithTTF("", "fonts/Marker Felt.ttf", 14);
    this->addChild(testReportLabel, 1);

    return true;
}

void HelloWorld::menuCloseCallback(Ref* pSender)
{
    Director::getInstance()->end();

#if (CC_TARGET_PLATFORM == CC_PLATFORM_IOS)
    exit(0);
#endif
}

void HelloWorld::update(float delta)
{
    Size visibleSize = Director::getInstance()->getVisibleSize();
    Vec2 origin = Director::getInstance()->getVisibleOrigin();

    bool finished = PlayFabApiTest::PlayFabApiTests::TickTestSuite();
    std::string testReport = PlayFabApiTest::PlayFabApiTests::GenerateTestSummary();
    testReportLabel->setPosition(Vec2(origin.x + visibleSize.width / 2, origin.y + visibleSize.height / 2));
    testReportLabel->setString(testReport);

    if (finished && HelloWorld::cmdLine.find("-exit") != std::string::npos)
        exit(0);
}
