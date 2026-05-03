#pragma once

#include <string>
#include "chesstrix/Position.hpp"

namespace chesstrix {

class Player {
public:
  Player(std::string name, Color color) : name_(std::move(name)), color_(color) {}
  const std::string& name() const { return name_; }
  Color color() const { return color_; }

private:
  std::string name_;
  Color color_;
};

}
