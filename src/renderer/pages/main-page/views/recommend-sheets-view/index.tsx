import Condition from "@/renderer/components/Condition";
import NoPlugin from "@/renderer/components/NoPlugin";
import { Tab } from "@headlessui/react";
import { getSupportedPlugin } from "@/renderer/core/plugin-delegate";
import { useNavigate } from "react-router-dom";
import Body from "./components/Body";

export default function RecommendSheetsView() {
  const availablePlugins = getSupportedPlugin("getRecommendSheetsByTag");
  const navigate = useNavigate();

  return (
    <Condition
      condition={availablePlugins.length}
      falsy={<NoPlugin supportMethod="热门歌单" height={"100%"}></NoPlugin>}
    >
      <Tab.Group
        defaultIndex={history.state?.usr?.pluginIndex}
        onChange={(index) => {
          const usr = history.state.usr ?? {};

          navigate("", {
            replace: true,
            state: {
              ...usr,
              pluginIndex: index,
            },
          });
        }}
      >
        <Tab.List className="tab-list-container">
          {availablePlugins.map((plugin) => (
            <Tab key={plugin.hash} as="div" className="tab-list-item">
              {plugin.platform}
            </Tab>
          ))}
        </Tab.List>
        <Tab.Panels className={"tab-panels-container"}>
          {availablePlugins.map((plugin) => (
            <Tab.Panel className="tab-panel-container" key={plugin.hash}>
              <Body plugin={plugin}></Body>
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </Condition>
  );
}
